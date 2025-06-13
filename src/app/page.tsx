
"use client";

import { useState, useEffect, useCallback } from "react";
import type { Task } from "@/lib/types";
import Header from "@/components/layout/header";
import TaskForm from "@/components/task-form";
import TaskListDisplay from "@/components/task-list-display";
import TaskInsightDialog from "@/components/task-insight-dialog";
import { provideTaskInsight, TaskInsightOutput } from "@/ai/flows/task-insight";
import { createTasklist, CreateTaskListOutput } from "@/ai/flows/create-task-list";
import { recordTaskEvent } from "@/ai/flows/record-task-event"; // Import the new flow
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

const LOCAL_STORAGE_KEY = "pocketTasksAI_tasks";

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [isFormProcessing, setIsFormProcessing] = useState<boolean>(false);

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
      
      if (!aiMessage) {
         setAiMessage("All tasks have been cleared from your list.");
      }
      toast({
        title: "List Cleared",
        description: "All tasks have been removed.",
      });
      return []; 
    });
  }, [toast, aiMessage, setAiMessage]);

  const handleCompleteAllTasks = useCallback(() => {
    setTasks(currentTasks => {
      if (currentTasks.length === 0) {
        // Toast will be handled by handleListCreated if called by AI
        // AI message will be set by handleListCreated
        return currentTasks;
      }
      if (currentTasks.every(task => task.completed)) {
        // Toast will be handled by handleListCreated if called by AI
        // AI message will be set by handleListCreated
        return currentTasks;
      }
      
      const allCompleted = currentTasks.map(task => ({ ...task, completed: true }));
      // Toast for success will be handled by handleListCreated using AI's reasoning
      // AI message will be set by handleListCreated using AI's reasoning
      return allCompleted;
    });
  }, []);


  const handleListCreated = useCallback((data: CreateTaskListOutput) => {
    let messageToSet = data.reasoning; 

    if (data.action === "clear_all_tasks") {
      if (!messageToSet) { 
        messageToSet = "Okay, I've processed your request to clear all tasks. Your list will be emptied.";
      }
      setAiMessage(messageToSet); 
      handleClearList(); 
      if (tasks.length > 0) { // Only toast if there were tasks to clear
        toast({ title: "List Cleared", description: "All tasks have been removed." });
      } else {
        toast({ title: "List is already empty", description: "There are no tasks to remove." });
      }
    } else if (data.action === "complete_all_tasks") {
      if (!messageToSet) { 
        messageToSet = "Okay, I've processed your request to mark all tasks as completed. Your tasks will be updated.";
      }
      setAiMessage(messageToSet); 
      const currentTaskCount = tasks.length;
      const allTasksAlreadyCompleted = tasks.every(task => task.completed);

      handleCompleteAllTasks();

      if (currentTaskCount === 0) {
        toast({ title: "No tasks to complete", description: "Your list is empty." });
      } else if (allTasksAlreadyCompleted) {
         toast({ title: "All tasks already completed", description: "There are no pending tasks to mark as complete." });
      } else {
        toast({ title: "All Tasks Completed!", description: "Great job, everything is marked as done!" });
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
        if (!messageToSet) { 
           messageToSet = tasksToAdd.length === 1 
            ? `Okay, I've added '${tasksToAdd[0]}' to your list. You can get more details or a breakdown using the info button!`
            : `Alright, I've drafted a plan with ${tasksToAdd.length} task(s) for you!`;
        }
        toast({
          title: "Tasks Added!",
          description: messageToSet,
        });
      } else if (!messageToSet) {
        messageToSet = "AI processed your request, but no new tasks were added.";
        toast({
          title: "AI Assistant",
          description: messageToSet,
        });
      } else {
         toast({ 
          title: "AI Assistant",
          description: messageToSet,
        });
      }
      setAiMessage(messageToSet);
    }
  }, [toast, handleClearList, handleCompleteAllTasks, setAiMessage, tasks]);


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

      // Record event for AI history
      recordTaskEvent({
        task_id: id,
        task_text: toggledTaskDescription,
        event_type: newCompletedState ? "completed" : "uncompleted",
        timestamp: new Date().toISOString(),
      }).then(response => {
        console.log('AI History: Task event recorded:', response);
      }).catch(error => {
        console.error('AI History: Error recording task event:', error);
      });

    } else {
      console.warn(`Task with ID ${id} not found for toggling.`);
      toast({
        title: "Error",
        description: "Could not find the task to toggle.",
        variant: "destructive",
      });
    }
  }, [toast]); // recordTaskEvent is stable, no need to add to deps unless it becomes unstable

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
          setIsProcessing={setIsFormProcessing}
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

