
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

  useEffect(() => {
    // Sync editText if task.text changes from outside (e.g. parent re-render with new task data)
    // and we are not currently editing. This prevents overwriting user's edits.
    if (!isEditing) {
      setEditText(task.text);
    }
  }, [task.text, isEditing]);


  const handleSave = () => {
    const trimmedText = editText.trim();
    if (trimmedText === "") {
      toast({
        title: "Task cannot be empty",
        description: "Please enter some text for your task.",
        variant: "destructive",
      });
      // Do not reset to task.text here, allow user to correct or cancel
      // Re-focus to allow correction
      inputRef.current?.focus(); 
      return; // Keep editing mode active
    }
    if (trimmedText !== task.text) {
      onUpdateText(task.id, trimmedText);
      // Toast for successful update is now handled in page.tsx
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(task.text); // Reset to original text
    setIsEditing(false);
  };

  const handleCopy = () => {
    if (task && task.text) {
      navigator.clipboard.writeText(task.text)
        .then(() => {
          toast({ title: "Task copied to clipboard!" });
        })
        .catch(err => {
          console.error("Failed to copy task: ", err);
          toast({ title: "Failed to copy task", variant: "destructive" });
        });
    }
  };
  
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault(); // Prevent form submission if wrapped in one
      handleSave();
    } else if (event.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleLabelClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent checkbox toggle if label is clicked
    if (!task.completed) { // Only allow editing if task is not completed
      setIsEditing(true);
    } else {
        toast({
            title: "Cannot edit completed task",
            description: "Mark the task as incomplete to edit its text.",
        });
    }
  };
  
  const handleCheckboxChange = () => {
    onToggleComplete(task.id);
  };

  const handleDeleteClick = () => {
    onDelete(task.id);
  };

  const handleGetInsightClick = () => {
    onGetInsight(task);
  }

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 bg-card border-border rounded-lg shadow-sm transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-primary/50",
      task.completed && "opacity-60 bg-card/70"
    )}>
      <Checkbox
        id={`task-${task.id}`}
        checked={task.completed}
        onCheckedChange={handleCheckboxChange}
        aria-label={task.completed ? `Mark task "${task.text}" as incomplete` : `Mark task "${task.text}" as complete`}
        className="border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground focus:ring-primary shrink-0"
      />
      {isEditing ? (
        <Input
          ref={inputRef}
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave} 
          className="flex-grow bg-background focus:ring-accent text-sm h-8" 
          aria-label={`Edit task text for "${task.text}"`}
        />
      ) : (
        <span // Changed from label to span to avoid checkbox toggle on click
          onClick={handleLabelClick}
          className={cn(
            "flex-grow cursor-pointer text-foreground text-sm py-1", 
            task.completed && "line-through text-muted-foreground",
            !task.completed && "hover:text-primary" // Add hover effect if not completed
          )}
          role="button" // Make it behave like a button for accessibility
          tabIndex={0} // Make it focusable
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleLabelClick(e as any); }} // Allow keyboard activation
        >
          {task.text}
        </span>
      )}
      <div className="flex gap-0.5 shrink-0">
        {isEditing ? (
          <>
            <Button variant="ghost" size="icon" onClick={handleSave} aria-label="Save task changes" className="h-8 w-8">
              <Save className="h-4 w-4 text-green-600" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleCancelEdit} aria-label="Cancel editing task" className="h-8 w-8">
              <XCircle className="h-4 w-4 text-destructive" />
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="icon" onClick={handleLabelClick} aria-label={`Edit task "${task.text}"`} className="h-8 w-8" disabled={task.completed}>
              <Edit3 className="h-4 w-4 text-foreground hover:text-primary" />
            </Button>
             <Button variant="ghost" size="icon" onClick={handleCopy} aria-label={`Copy task text for "${task.text}"`} className="h-8 w-8">
              <Copy className="h-4 w-4 text-foreground hover:text-primary" />
            </Button>
          </>
        )}
        <Button variant="ghost" size="icon" onClick={handleGetInsightClick} aria-label={`Get AI insight for task "${task.text}"`} className="h-8 w-8">
          <Info className="h-4 w-4 text-foreground hover:text-accent" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleDeleteClick} aria-label={`Delete task "${task.text}"`} className="h-8 w-8">
          <Trash2 className="h-4 w-4 text-destructive hover:text-red-700" />
        </Button>
      </div>
    </div>
  );
}
