
"use client";

import type { Task } from "@/lib/types";
import TaskItemDisplay from "./task-item-display";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ListX } from "lucide-react"; // Using a more appropriate icon

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
      <div className="text-center py-10 px-4 flex flex-col items-center justify-center text-muted-foreground h-full">
        <ListX className="h-16 w-16 mb-4 text-primary/50" />
        <h3 className="text-xl font-semibold text-foreground mb-2">Your task list is empty!</h3>
        <p className="text-center max-w-md">
          Use the form above to generate tasks with AI, or get started by typing out what you need to do.
        </p>
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
