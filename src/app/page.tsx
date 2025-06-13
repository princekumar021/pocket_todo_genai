
"use client";

import { useState, useEffect, useCallback } from "react";
import type { Task } from "@/lib/types";
import Header from "@/components/layout/header";
import TaskForm from "@/components/task-form";
import TaskListDisplay from "@/components/task-list-display";
import TaskInsightDialog from "@/components/task-insight-dialog";
import { provideTaskInsight, TaskInsightOutput } from "@/ai/flows/task-insight";
import { createTasklist, CreateTaskListOutput } from "@/ai/flows/create-task-list";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

const LOCAL_STORAGE_KEY = "pocketTasksAI_tasks";

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [isFormProcessing, setIsFormProcessing] = useState<boolean>(false); // Re-added this line

  const [taskForInsight, setTaskForInsight] = useState<Task | null>(null);
  const [insightData, setInsightData] = useState<TaskInsightOutput | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState<boolean>(false);
  const [isInsightDialogOpen, setIsInsightDialogOpen] = useState<boolean>(false);

  const [isMounted, setIsMounted] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    setIsMounted(true);
    try {
      const storedTasks = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedTasks) {
        const parsedTasks = JSON.parse(storedTasks);
        if (Array.isArray(parsedTasks)) {
          setTasks(parsedTasks.map(t => ({
            ...t,
            id: t.id || crypto.randomUUID() 
          })));
        }
      }
    } catch (error) {
      console.error("Failed to parse tasks from localStorage on init", error);
      localStorage.removeItem(LOCAL_STORAGE_KEY); 
    }
  }, []);

  useEffect(() => {
    if (isMounted) { 
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
    }
  }, [tasks, isMounted]);

  const handleClearList = useCallback(() => {
    setTasks(currentTasks => {
      if (currentTasks.length === 0) {
        toast({
          title: "List is already empty",
          description: "There are no tasks to remove.",
        });
        setAiMessage("Your list is already empty!");
        return currentTasks; 
      }
      
      setAiMessage("All tasks have been cleared from your list.");
      toast({
        title: "List Cleared",
        description: "All tasks have been removed.",
      });
      return []; 
    });
  }, [toast, setAiMessage]);

  const handleListCreated = useCallback((data: CreateTaskListOutput) => {
    if (data.action === "clear_all_tasks") {
      handleClearList(); 
      if (data.reasoning) {
          setAiMessage(data.reasoning); 
      }
    } else { 
      const tasksToAdd = Array.isArray(data.taskList) ? data.taskList : [];

      if (tasksToAdd.length > 0) {
        setTasks((prevTasks) => {
          const newTasks: Task[] = tasksToAdd.map((text) => ({
            id: crypto.randomUUID(),
            text,
            completed: false,
          }));
          return [...newTasks, ...prevTasks];
        });
        const message = data.reasoning || `AI has added ${tasksToAdd.length} task(s) to your list!`;
        setAiMessage(message);
        toast({
          title: "Tasks Added!",
          description: message,
        });
      } else if (data.reasoning) {
        setAiMessage(data.reasoning);
        toast({
          title: "AI Assistant",
          description: data.reasoning,
        });
      } else {
        const message = "AI processed your request, but no new tasks were added.";
        setAiMessage(message);
        toast({
          title: "AI Assistant",
          description: message,
        });
      }
    }
  }, [toast, handleClearList, setAiMessage]);


  const handleToggleComplete = useCallback((id: string) => {
    let toggledTaskDescription = "";
    let newCompletedState = false;

    setTasks((prevTasks) =>
      prevTasks.map((task) => {
        if (task.id === id) {
          toggledTaskDescription = task.text;
          newCompletedState = !task.completed;
          return { ...task, completed: newCompletedState };
        }
        return task;
      })
    );

    if (toggledTaskDescription) {
      toast({
        title: `Task ${newCompletedState ? "completed!" : "marked incomplete"}`,
        description: `"${toggledTaskDescription}" state updated.`,
      });
    } else {
      console.warn(`Task with ID ${id} not found for toggling.`);
      toast({
        title: "Error",
        description: "Could not find the task to toggle.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleDeleteTask = useCallback((id: string) => {
    let deletedTaskDescription = "";
    setTasks((prevTasks) => {
      const taskToDelete = prevTasks.find(task => task.id === id);
      if (taskToDelete) {
        deletedTaskDescription = taskToDelete.text;
      }
      return prevTasks.filter((task) => task.id !== id);
    });

    if (deletedTaskDescription) {
      toast({
        title: "Task deleted",
        description: `"${deletedTaskDescription}" has been removed.`,
      });
    } else {
      console.warn(`Task with ID ${id} not found for deletion.`);
      toast({
        title: "Error",
        description: "Could not find the task to delete.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleUpdateTaskText = useCallback((id: string, newText: string) => {
    let originalTaskText = "";
    setTasks((prevTasks) =>
      prevTasks.map((task) => {
        if (task.id === id) {
          originalTaskText = task.text;
          return { ...task, text: newText };
        }
        return task;
      })
    );
    if (originalTaskText) {
        toast({
          title: "Task updated!",
          description: `"${originalTaskText}" changed to "${newText}".`,
        });
    } else { 
        toast({
          title: "Task updated!",
          description: `A task was updated to "${newText}".`,
        });
    }
  }, [toast]);

  const handleGetTaskInsight = useCallback(async (task: Task) => {
    if (!task || !task.id) {
      console.error("Invalid task provided for insight:", task);
      toast({
        title: "Error",
        description: "Cannot get insights for an invalid task.",
        variant: "destructive",
      });
      return;
    }
    setTaskForInsight(task);
    setIsInsightDialogOpen(true);
    setIsLoadingInsight(true);
    setInsightData(null); 
    try {
      const currentTaskList = tasks.map(t => t.text).join('\n');
      const insight = await provideTaskInsight({
        task: task.text,
        taskList: currentTaskList,
      });
      setInsightData(insight);
    } catch (error) {
      console.error("Failed to get task insight:", error);
      setInsightData(null); 
      toast({
        title: "Error fetching insight",
        description: "Could not retrieve AI insights for this task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingInsight(false);
    }
  }, [tasks, toast]); 

  const handleAddSubTasksToList = useCallback((subTaskTexts: string[], parentTaskText: string) => {
    setTasks(prevTasks => {
      const newSubTasks: Task[] = subTaskTexts.map(text => ({
        id: crypto.randomUUID(),
        text: `Sub-task for "${parentTaskText}": ${text}`,
        completed: false,
      }));
      return [...newSubTasks, ...prevTasks];
    });
    const successMessage = `${subTaskTexts.length} sub-task(s) related to "${parentTaskText}" added to your list.`;
    toast({
      title: "Sub-tasks added!",
      description: successMessage,
    });
    setAiMessage(successMessage); 
  }, [toast, setAiMessage]);


  return (
    <div className="flex flex-col flex-grow">
      <Header onClearList={handleClearList} taskCount={isMounted ? tasks.length : 0} />
      <main className="container mx-auto px-4 py-6 flex-grow flex flex-col gap-6">
        <TaskForm
          onListCreated={handleListCreated}
          isProcessing={isFormProcessing}
          setIsProcessing={setIsFormProcessing} // Re-added this prop
        />

        {aiMessage && !isFormProcessing && (
          <Alert className="bg-primary/10 border-primary/30 text-primary-foreground shadow-sm rounded-lg animate-in fade-in-50 slide-in-from-top-5 duration-500">
            <Terminal className="h-5 w-5 text-primary" />
            <AlertTitle className="font-headline text-primary">AI Assistant</AlertTitle>
            <AlertDescription>
              {aiMessage}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex-grow">
          <TaskListDisplay
            tasks={isMounted ? tasks : []}
            onToggleComplete={handleToggleComplete}
            onDelete={handleDeleteTask}
            onUpdateText={handleUpdateTaskText}
            onGetInsight={handleGetTaskInsight}
          />
        </div>
      </main>

      <TaskInsightDialog
        isOpen={isInsightDialogOpen}
        onOpenChange={setIsInsightDialogOpen}
        taskText={taskForInsight?.text || null}
        insightData={insightData}
        isLoading={isLoadingInsight}
        onAddSubTasks={handleAddSubTasksToList}
      />
    </div>
  );
}

