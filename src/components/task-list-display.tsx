"use client";

import type { Task } from "@/lib/types";
import TaskItemDisplay from "./task-item-display";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";

interface TaskListDisplayProps {
  tasks: Task[];
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateText: (id: string, newText: string) => void;
  onGetInsight: (task: Task) => void;
}

export default function TaskListDisplay({
  tasks,
  onToggleComplete,
  onDelete,
  onUpdateText,
  onGetInsight,
}: TaskListDisplayProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-10 px-4">
        <Image 
          src="https://placehold.co/300x200.png" 
          alt="Empty task list placeholder" 
          width={300} 
          height={200} 
          className="mx-auto mb-6 rounded-lg shadow-md"
          data-ai-hint="empty checklist" 
        />
        <h3 className="text-xl font-semibold text-foreground mb-2">Your task list is empty!</h3>
        <p className="text-muted-foreground">Use the form above to generate tasks with AI, or add them manually.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-350px)] md:h-[calc(100vh-320px)]"> {/* Adjust height as needed */}
      <div className="space-y-3 p-4 md:p-1">
        {tasks.map((task) => (
          <TaskItemDisplay
            key={task.id}
            task={task}
            onToggleComplete={onToggleComplete}
            onDelete={onDelete}
            onUpdateText={onUpdateText}
            onGetInsight={onGetInsight}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
