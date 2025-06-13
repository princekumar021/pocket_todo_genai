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
import { Loader2 } from "lucide-react";

interface TaskInsightDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  taskText: string | null;
  insightData: TaskInsightOutput | null;
  isLoading: boolean;
}

export default function TaskInsightDialog({
  isOpen,
  onOpenChange,
  taskText,
  insightData,
  isLoading,
}: TaskInsightDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-popover text-popover-foreground rounded-lg shadow-xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl">AI Task Insight</DialogTitle>
          {taskText && <DialogDescription className="text-sm">Insights for: "{taskText}"</DialogDescription>}
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] p-1">
          <div className="py-4 space-y-4">
            {isLoading && (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Fetching insights...</p>
              </div>
            )}
            {!isLoading && insightData && (
              <>
                <div>
                  <h4 className="font-semibold text-md mb-1">Estimated Time to Complete:</h4>
                  <p className="text-sm ">{insightData.estimatedTimeToComplete}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-md mb-1">Potential Dependencies:</h4>
                  <p className="text-sm ">{insightData.potentialDependencies}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-md mb-1">Additional Notes:</h4>
                  <p className="text-sm ">{insightData.additionalNotes}</p>
                </div>
              </>
            )}
            {!isLoading && !insightData && (
              <p className="text-muted-foreground">No insights available or an error occurred.</p>
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
