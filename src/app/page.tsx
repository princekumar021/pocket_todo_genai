
"use client";

import { useState, useEffect, useCallback } from "react";
import type { Task } from "@/lib/types";
import Header from "@/components/layout/header";
import TaskForm from "@/components/task-form";
import TaskListDisplay from "@/components/task-list-display";
import TaskInsightDialog from "@/components/task-insight-dialog";
import { provideTaskInsight, TaskInsightOutput } from "@/ai/flows/task-insight";
import { createTasklist, CreateTaskListOutput } from "@/ai/flows/create-task-list";
import { recordTaskEvent } from "@/ai/flows/record-task-event";
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
    const currentTaskCount = tasks.length;
    setTasks([]); 
    return currentTaskCount > 0; 
  }, [tasks]);


  const handleCompleteAllTasks = useCallback(() => {
    const currentTaskCount = tasks.length;
    const allTasksAlreadyCompleted = tasks.every(task => task.completed);
    
    if (currentTaskCount === 0 || allTasksAlreadyCompleted) {
      return false; 
    }

    setTasks(currentTasks => currentTasks.map(task => ({ ...task, completed: true })));
    return true; 
  }, [tasks]);


  const handleListCreated = useCallback((data: CreateTaskListOutput) => {
    let messageToSet = data.reasoning; 

    if (data.action === "clear_all_tasks") {
      if (!messageToSet) { 
        messageToSet = "Okay, I've processed your request to clear all tasks. Your list will be emptied.";
      }
      const tasksWereCleared = handleClearList(); 
      if (tasksWereCleared) {
        toast({ title: "List Cleared", description: "All tasks have been removed." });
      } else {
        toast({ title: "List is already empty", description: "There are no tasks to remove." });
      }
      setAiMessage(messageToSet); 
    } else if (data.action === "complete_all_tasks") {
      if (!messageToSet) { 
        messageToSet = "Okay, I've processed your request to mark all tasks as completed. Your tasks will be updated.";
      }
      const tasksWereUpdated = handleCompleteAllTasks();
      if (tasksWereUpdated) {
        toast({ title: "All Tasks Completed!", description: "Great job, everything is marked as done!" });
      } else if (tasks.length === 0) {
        toast({ title: "No tasks to complete", description: "Your list is empty." });
      } else {
         toast({ title: "All tasks already completed", description: "There are no pending tasks to mark as complete." });
      }
      setAiMessage(messageToSet); 
    } else if (data.action === "query_task_count") {
      // Construct message locally for real-time accuracy
      const currentTaskCount = tasks.length;
      if (currentTaskCount > 0) {
        messageToSet = `You currently have ${currentTaskCount} task${currentTaskCount === 1 ? '' : 's'}.`;
      } else {
        messageToSet = "You currently have no tasks.";
      }
      
      if (data.reasoning && data.reasoning !== "You're asking about your task count. The application will provide this information.") {
        // If AI provides more specific reasoning (e.g. an error message), append it or prioritize it.
        // For now, we'll stick to the client-generated message for accuracy.
        console.log("AI reasoning for task count query:", data.reasoning);
      }

      setAiMessage(messageToSet);
      toast({
        title: "AI Assistant",
        description: messageToSet,
      });
    } else { // Default to "add_tasks"
      const tasksToAdd = Array.isArray(data.taskList) ? data.taskList : [];

      if (tasksToAdd.length > 0) {
        const newTasks: Task[] = tasksToAdd.map((text) => ({
          id: crypto.randomUUID(),
          text,
          completed: false,
        }));
        
        setTasks((prevTasks) => [...newTasks, ...prevTasks]);

        newTasks.forEach(task => {
          recordTaskEvent({
            task_id: task.id,
            task_text: task.text,
            event_type: "created",
            timestamp: new Date().toISOString(),
          }).then(response => {
            console.log('AI History: Task creation event recorded:', response);
          }).catch(error => {
            console.error('AI History: Error recording task creation event:', error);
          });
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

      recordTaskEvent({
        task_id: id,
        task_text: toggledTaskDescription,
        event_type: newCompletedState ? "completed" : "uncompleted",
        timestamp: new Date().toISOString(),
      }).then(response => {
        console.log('AI History: Task toggle event recorded:', response);
      }).catch(error => {
        console.error('AI History: Error recording task toggle event:', error);
      });

    } else {
      console.warn(`Task with ID ${id} not found for toggling.`);
      toast({
        title: "Error",
        description: "Could not find the task to toggle.",
        variant: "destructive",
      });
    }
  }, [toast, setTasks]); 

  const handleDeleteTask = useCallback((id: string) => {
    let taskToDelete: Task | undefined;

    setTasks((prevTasks) => {
      taskToDelete = prevTasks.find(task => task.id === id);
      return prevTasks.filter((task) => task.id !== id);
    });

    if (taskToDelete) {
      toast({
        title: "Task deleted",
        description: `"${taskToDelete.text}" has been removed.`,
      });
      recordTaskEvent({
        task_id: taskToDelete.id,
        task_text: taskToDelete.text,
        event_type: "deleted",
        timestamp: new Date().toISOString(),
      }).then(response => {
        console.log('AI History: Task deletion event recorded:', response);
      }).catch(error => {
        console.error('AI History: Error recording task deletion event:', error);
      });
    } else {
      console.warn(`Task with ID ${id} not found for deletion.`);
      toast({
        title: "Error",
        description: "Could not find the task to delete.",
        variant: "destructive",
      });
    }
  }, [toast, setTasks]);

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
        recordTaskEvent({
          task_id: id,
          task_text: originalTaskText, 
          event_type: "text_updated",
          new_text: newText,
          timestamp: new Date().toISOString(),
        }).then(response => {
          console.log('AI History: Task text update event recorded:', response);
        }).catch(error => {
          console.error('AI History: Error recording task text update event:', error);
        });
    } else { 
        // This case should ideally not happen if a task is found and updated
        toast({
          title: "Task updated!",
          description: `A task's text was updated.`,
        });
         recordTaskEvent({
          task_id: id,
          task_text: "Unknown original text", 
          event_type: "text_updated",
          new_text: newText,
          timestamp: new Date().toISOString(),
        }).then(response => {
          console.log('AI History: Task text update event recorded (original text unknown):', response);
        }).catch(error => {
          console.error('AI History: Error recording task text update event (original text unknown):', error);
        });
    }
  }, [toast, setTasks]);

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
      const errorMessage = (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') 
        ? error.message 
        : 'An unknown error occurred.';
      
      if (!errorMessage.toLowerCase().includes("service") && !errorMessage.toLowerCase().includes("ai could not provide")) {
        toast({
          title: "Error fetching insight",
          description: "Could not retrieve AI insights for this task. Please try again.",
          variant: "destructive",
        });
      } 
    } finally {
      setIsLoadingInsight(false);
    }
  }, [tasks, toast]); 

  const handleAddSubTasksToList = useCallback((subTaskTexts: string[], parentTaskText: string) => {
    const newSubTasks: Task[] = subTaskTexts.map(text => ({
      id: crypto.randomUUID(),
      text: `Sub-task for "${parentTaskText}": ${text}`,
      completed: false,
    }));

    setTasks(prevTasks => {
      newSubTasks.forEach(task => {
        recordTaskEvent({
          task_id: task.id,
          task_text: task.text,
          event_type: "created",
          timestamp: new Date().toISOString(),
        }).then(response => {
          console.log('AI History: Sub-task creation event recorded:', response);
        }).catch(error => {
          console.error('AI History: Error recording sub-task creation event:', error);
        });
      });
      return [...newSubTasks, ...prevTasks];
    });
    const successMessage = `${subTaskTexts.length} sub-task(s) related to "${parentTaskText}" added to your list.`;
    toast({
      title: "Sub-tasks added!",
      description: successMessage,
    });
    setAiMessage(successMessage); 
  }, [toast, setAiMessage, setTasks]);


  return (
    <div className="flex flex-col flex-grow">
      <Header onClearList={() => { 
        handleListCreated({ 
          taskList: [], 
          reasoning: tasks.length > 0 ? "Okay, I've cleared all tasks from your list." : "Your list is already empty.", 
          action: "clear_all_tasks" 
        });
      }} taskCount={isMounted ? tasks.length : 0} />
      <main className="container mx-auto px-4 py-6 flex-grow flex flex-col gap-6">
        <TaskForm
          onListCreated={handleListCreated}
          isProcessing={isFormProcessing}
          setIsProcessing={setIsFormProcessing}
          taskCount={tasks.length} 
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

