
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { createTasklist, CreateTaskListOutput } from "@/ai/flows/create-task-list";
import { Sparkles, Loader2 } from "lucide-react"; // Correctly import Sparkles
import { useToast } from "@/hooks/use-toast";


const FormSchema = z.object({
  prompt: z.string().min(10, {
    message: "Prompt must be at least 10 characters.",
  }),
});

interface TaskFormProps {
  onListCreated: (data: CreateTaskListOutput) => void;
  isProcessing: boolean;
  setIsProcessing: (isProcessing: boolean) => void;
}

export default function TaskForm({ onListCreated, isProcessing, setIsProcessing }: TaskFormProps) {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      prompt: "",
    },
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setIsProcessing(true);
    try {
      const result = await createTasklist({ prompt: data.prompt });
      onListCreated(result);
      form.reset(); 
    } catch (error) {
      console.error("Failed to create task list:", error);
      toast({
        title: "Error generating tasks",
        description: "The AI could not generate tasks for your prompt. Please try again or rephrase your request.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-4 md:p-6 bg-card shadow-sm rounded-lg">
        <FormField
          control={form.control}
          name="prompt"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg font-semibold text-foreground">What's on your mind?</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="e.g., Plan my weekend: buy groceries, book movie tickets, and finish the report."
                  className="resize-none min-h-[100px] focus:ring-primary focus:border-primary"
                  {...field}
                  aria-label="Task prompt input"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isProcessing} aria-label="Generate task list">
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating with AI...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              Generate Task List
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
