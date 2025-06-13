
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
      // Optional: Select text on edit
      // inputRef.current.select(); 
    }
  }, [isEditing]);

  // Sync editText with task.text if task.text changes externally (e.g., from sub-task addition)
  useEffect(() => {
    setEditText(task.text);
  }, [task.text]);


  const handleSave = () => {
    if (editText.trim() === "") {
      toast({
        title: "Task cannot be empty",
        description: "Please enter some text for your task.",
        variant: "destructive",
      });
      setEditText(task.text); // Reset to original text if save fails
      setIsEditing(false);
      return;
    }
    if (editText.trim() !== task.text) {
      onUpdateText(task.id, editText.trim());
      // Toast for update is now handled in page.tsx to ensure it's shown after state update
    }
    setIsEditing(false);
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
      "flex items-center gap-3 p-3 bg-card border-border rounded-lg shadow-sm transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-primary/50",
      task.completed && "opacity-60 bg-card/70"
    )}>
      <Checkbox
        id={`task-${task.id}`}
        checked={task.completed}
        onCheckedChange={() => onToggleComplete(task.id)}
        aria-label={task.completed ? `Mark task "${task.text}" as incomplete` : `Mark task "${task.text}" as complete`}
        className="border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground focus:ring-primary"
      />
      {isEditing ? (
        <Input
          ref={inputRef}
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave} // Save on blur
          className="flex-grow bg-background focus:ring-accent text-sm"
          aria-label={`Edit task text for "${task.text}"`}
        />
      ) : (
        <label
          htmlFor={`task-${task.id}`}
          onClick={() => setIsEditing(true)} // Allow clicking text to edit
          className={cn(
            "flex-grow cursor-pointer text-foreground text-sm py-1.5", // Added padding for easier click
            task.completed && "line-through text-muted-foreground"
          )}
        >
          {task.text}
        </label>
      )}
      <div className="flex gap-0.5 shrink-0"> {/* Reduced gap */}
        {isEditing ? (
          <>
            <Button variant="ghost" size="icon" onClick={handleSave} aria-label="Save task changes">
              <Save className="h-4 w-4 text-green-600" /> {/* Slightly smaller icons */}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleCancelEdit} aria-label="Cancel editing task">
              <XCircle className="h-4 w-4 text-destructive" />
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} aria-label={`Edit task "${task.text}"`}>
              <Edit3 className="h-4 w-4 text-foreground hover:text-primary" />
            </Button>
             <Button variant="ghost" size="icon" onClick={handleCopy} aria-label={`Copy task text for "${task.text}"`}>
              <Copy className="h-4 w-4 text-foreground hover:text-primary" />
            </Button>
          </>
        )}
        <Button variant="ghost" size="icon" onClick={() => onGetInsight(task)} aria-label={`Get AI insight for task "${task.text}"`}>
          <Info className="h-4 w-4 text-foreground hover:text-accent" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(task.id)} aria-label={`Delete task "${task.text}"`}>
          <Trash2 className="h-4 w-4 text-destructive hover:text-red-700" />
        </Button>
      </div>
    </div>
  );
}
