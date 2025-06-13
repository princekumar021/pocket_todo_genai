
'use server';
/**
 * @fileOverview A Genkit flow to record task-related events for AI history.
 *
 * - recordTaskEvent - A function to log task events.
 * - RecordTaskEventInput - The input type for the recordTaskEvent function.
 * - RecordTaskEventOutput - The return type for the recordTaskEvent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RecordTaskEventInputSchema = z.object({
  task_id: z.string().describe('The ID of the task.'),
  task_text: z.string().describe('The text content of the task.'),
  event_type: z.enum(["completed", "uncompleted", "created", "deleted", "text_updated"])
    .describe('The type of event that occurred.'),
  new_text: z.string().optional().describe('The new text if the event is "text_updated".'),
  timestamp: z.string().datetime().describe('The ISO 8601 timestamp of when the event occurred.'),
});
export type RecordTaskEventInput = z.infer<typeof RecordTaskEventInputSchema>;

const RecordTaskEventOutputSchema = z.object({
  success: z.boolean().describe('Whether the event was recorded successfully.'),
  message: z.string().describe('A message indicating the outcome.'),
});
export type RecordTaskEventOutput = z.infer<typeof RecordTaskEventOutputSchema>;

export async function recordTaskEvent(input: RecordTaskEventInput): Promise<RecordTaskEventOutput> {
  return recordTaskEventFlow(input);
}

// This flow currently just logs to the console.
// In a real application, this could write to a database, a log file, or another system.
const recordTaskEventFlow = ai.defineFlow(
  {
    name: 'recordTaskEventFlow',
    inputSchema: RecordTaskEventInputSchema,
    outputSchema: RecordTaskEventOutputSchema,
  },
  async (input) => {
    console.log('[AI History] Task Event Recorded:', JSON.stringify(input, null, 2));
    // In the future, this is where you could add logic to store this event
    // in a database or send it to a more advanced AI memory system.
    return {
      success: true,
      message: 'Task event recorded successfully for AI history.',
    };
  }
);
