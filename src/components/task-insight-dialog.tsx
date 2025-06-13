
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { TaskInsightOutput } from "@/ai/flows/task-insight";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ListPlus, CheckCircle2, ListX } from "lucide-react"; // Added ListX here
import { Badge } from "@/components/ui/badge";

interface TaskInsightDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  taskText: string | null;
  insightData: TaskInsightOutput | null;
  isLoading: boolean;
  onAddSubTasks: (subTasks: string[], parentTaskText: string) => void;
}

export default function TaskInsightDialog({
  isOpen,
  onOpenChange,
  taskText,
  insightData,
  isLoading,
  onAddSubTasks,
}: TaskInsightDialogProps) {

  const handleAddSubTasks = () => {
    if (insightData?.subTasks && taskText) {
      onAddSubTasks(insightData.subTasks, taskText);
      onOpenChange(false); // Close dialog after adding
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-popover text-popover-foreground rounded-lg shadow-xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl">AI Task Insight</DialogTitle>
          {taskText && <DialogDescription className="text-sm">Insights for: "{taskText}"</DialogDescription>}
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] p-1 pr-3"> {/* Added pr-3 for scrollbar space */}
          <div className="py-4 space-y-6">
            {isLoading && (
              <div className="flex flex-col items-center justify-center p-8 space-y-2">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">AI is analyzing your task...</p>
              </div>
            )}
            {!isLoading && insightData && (
              <>
                {insightData.estimatedTimeToComplete && (
                  <div>
                    <h4 className="font-semibold text-md mb-1">Estimated Time to Complete:</h4>
                    <Badge variant="secondary">{insightData.estimatedTimeToComplete}</Badge>
                  </div>
                )}
                
                {insightData.subTasks && insightData.subTasks.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-md mb-2">Breakdown / Ingredients:</h4>
                    <ul className="space-y-1.5 list-disc list-inside pl-2 text-sm">
                      {insightData.subTasks.map((subTask, index) => (
                        <li key={index} className="text-popover-foreground/90">{subTask}</li>
                      ))}
                    </ul>
                    <Button onClick={handleAddSubTasks} size="sm" className="mt-3 w-full bg-primary hover:bg-primary/90">
                      <ListPlus className="mr-2 h-4 w-4" /> Add to My Task List
                    </Button>
                  </div>
                )}

                {insightData.potentialDependencies && (
                  <div>
                    <h4 className="font-semibold text-md mb-1">Potential Dependencies:</h4>
                    <p className="text-sm text-popover-foreground/90">{insightData.potentialDependencies}</p>
                  </div>
                )}
                
                {insightData.additionalNotes && (
                  <div>
                    <h4 className="font-semibold text-md mb-1">Additional Notes & Summary:</h4>
                    <p className="text-sm text-popover-foreground/90 whitespace-pre-wrap">{insightData.additionalNotes}</p>
                  </div>
                )}

                {!insightData.estimatedTimeToComplete && 
                 (!insightData.subTasks || insightData.subTasks.length === 0) &&
                 !insightData.potentialDependencies &&
                 !insightData.additionalNotes && (
                  <div className="flex flex-col items-center justify-center p-6 text-center">
                    <CheckCircle2 className="h-10 w-10 text-green-500 mb-2" />
                    <p className="text-muted-foreground">AI analysis complete. No specific actions or detailed breakdown found for this task, but it's acknowledged!</p>
                  </div>
                )}
              </>
            )}
            {!isLoading && !insightData && (
               <div className="flex flex-col items-center justify-center p-6 text-center">
                <ListX className="h-10 w-10 text-destructive mb-2" />
                <p className="text-muted-foreground">No insights available or an error occurred while fetching them.</p>
              </div>
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

