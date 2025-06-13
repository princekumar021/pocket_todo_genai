"use client";

import type { Task } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Edit3, Save, XCircle, Info, Copy } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface TaskItemDisplayProps {
  task: Task;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateText: (id: string, newText: string) => void;
  onGetInsight: (task: Task) => void;
}

export default function TaskItemDisplay({
  task,
  onToggleComplete,
  onDelete,
  onUpdateText,
  onGetInsight,
}: TaskItemDisplayProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task.text);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editText.trim() === "") {
      toast({
        title: "Task cannot be empty",
        variant: "destructive",
      });
      setEditText(task.text); // Reset to original text
      setIsEditing(false);
      return;
    }
    onUpdateText(task.id, editText.trim());
    setIsEditing(false);
    toast({
      title: "Task updated!",
      description: "Your changes have been saved.",
    });
  };

  const handleCancelEdit = () => {
    setEditText(task.text);
    setIsEditing(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(task.text)
      .then(() => {
        toast({ title: "Task copied to clipboard!" });
      })
      .catch(err => {
        console.error("Failed to copy task: ", err);
        toast({ title: "Failed to copy task", variant: "destructive" });
      });
  };
  
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSave();
    } else if (event.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 bg-card border border-border rounded-lg shadow-sm transition-all hover:shadow-md",
      task.completed && "opacity-60"
    )}>
      <Checkbox
        id={`task-${task.id}`}
        checked={task.completed}
        onCheckedChange={() => onToggleComplete(task.id)}
        aria-label={task.completed ? "Mark task as incomplete" : "Mark task as complete"}
        className="border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground focus:ring-primary"
      />
      {isEditing ? (
        <Input
          ref={inputRef}
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-grow bg-background focus:ring-accent"
          aria-label="Edit task text"
        />
      ) : (
        <label
          htmlFor={`task-${task.id}`}
          className={cn(
            "flex-grow cursor-pointer text-foreground",
            task.completed && "line-through text-muted-foreground"
          )}
        >
          {task.text}
        </label>
      )}
      <div className="flex gap-1 shrink-0">
        {isEditing ? (
          <>
            <Button variant="ghost" size="icon" onClick={handleSave} aria-label="Save task changes">
              <Save className="h-5 w-5 text-green-600" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleCancelEdit} aria-label="Cancel editing task">
              <XCircle className="h-5 w-5 text-destructive" />
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} aria-label="Edit task">
              <Edit3 className="h-5 w-5 text-foreground hover:text-primary" />
            </Button>
             <Button variant="ghost" size="icon" onClick={handleCopy} aria-label="Copy task text">
              <Copy className="h-5 w-5 text-foreground hover:text-primary" />
            </Button>
          </>
        )}
        <Button variant="ghost" size="icon" onClick={() => onGetInsight(task)} aria-label="Get AI insight for task">
          <Info className="h-5 w-5 text-foreground hover:text-accent" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(task.id)} aria-label="Delete task">
          <Trash2 className="h-5 w-5 text-destructive hover:text-red-700" />
        </Button>
      </div>
    </div>
  );
}
