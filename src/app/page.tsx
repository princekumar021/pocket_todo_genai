"use client";

import { useState, useEffect } from "react";
import type { Task } from "@/lib/types";
import Header from "@/components/layout/header";
import TaskForm from "@/components/task-form";
import TaskListDisplay from "@/components/task-list-display";
import TaskInsightDialog from "@/components/task-insight-dialog";
import { provideTaskInsight, TaskInsightOutput, TaskInsightInput } from "@/ai/flows/task-insight";
import type { CreateTaskListOutput } from "@/ai/flows/create-task-list";
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

  const { toast } = useToast();

  useEffect(() => {
    const storedTasks = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedTasks) {
      try {
        const parsedTasks = JSON.parse(storedTasks);
        if (Array.isArray(parsedTasks)) {
          setTasks(parsedTasks);
        }
      } catch (error) {
        console.error("Failed to parse tasks from localStorage", error);
        localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear corrupted data
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const handleListCreated = (data: CreateTaskListOutput) => {
    const newTasks = data.taskList.map((text) => ({
      id: crypto.randomUUID(),
      text,
      completed: false,
    }));
    setTasks((prevTasks) => [...newTasks, ...prevTasks]); // Add new tasks to the beginning
    setAiMessage(data.reasoning || "Your new task list has been generated!");
    toast({
      title: "Task list created!",
      description: data.reasoning || "AI has generated your tasks.",
    });
  };

  const handleToggleComplete = (id: string) => {
    setTasks(
      tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const handleDeleteTask = (id: string) => {
    setTasks(tasks.filter((task) => task.id !== id));
    toast({
      title: "Task deleted",
      description: "The task has been removed from your list.",
      variant: "destructive"
    });
  };

  const handleUpdateTaskText = (id: string, newText: string) => {
    setTasks(
      tasks.map((task) => (task.id === id ? { ...task, text: newText } : task))
    );
  };

  const handleGetTaskInsight = async (task: Task) => {
    setTaskForInsight(task);
    setIsInsightDialogOpen(true);
    setIsLoadingInsight(true);
    setInsightData(null);
    try {
      const insight = await provideTaskInsight({
        task: task.text,
        taskList: tasks.map(t => t.text).join('\n'), // Provide context of the whole list
      });
      setInsightData(insight);
    } catch (error) {
      console.error("Failed to get task insight:", error);
      toast({
        title: "Error fetching insight",
        description: "Could not retrieve AI insights for this task.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingInsight(false);
    }
  };

  const handleClearList = () => {
    setTasks([]);
    setAiMessage(null);
    toast({
      title: "List Cleared",
      description: "All tasks have been removed.",
    });
  };


  return (
    <div className="flex flex-col flex-grow">
      <Header onClearList={handleClearList} taskCount={tasks.length} />
      <main className="container mx-auto px-4 py-6 flex-grow flex flex-col gap-6">
        <TaskForm 
          onListCreated={handleListCreated} 
          isProcessing={isFormProcessing}
          setIsProcessing={setIsFormProcessing}
        />

        {aiMessage && !isFormProcessing && (
          <Alert className="bg-accent/10 border-accent/30 text-accent-foreground shadow-sm rounded-lg animate-in fade-in-50 slide-in-from-top-5 duration-500">
            <Terminal className="h-5 w-5 text-accent" />
            <AlertTitle className="font-headline text-accent">AI Assistant</AlertTitle>
            <AlertDescription>
              {aiMessage}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex-grow">
          <TaskListDisplay
            tasks={tasks}
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
      />
    </div>
  );
}
