'use server';

/**
 * @fileOverview Task insight AI agent.
 *
 * - provideTaskInsight - A function that provides insights for a given task.
 * - TaskInsightInput - The input type for the provideTaskInsight function.
 * - TaskInsightOutput - The return type for the provideTaskInsight function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TaskInsightInputSchema = z.object({
  task: z.string().describe('The task to provide insights for.'),
  taskList: z.string().describe('The list containing the task.'),
});
export type TaskInsightInput = z.infer<typeof TaskInsightInputSchema>;

const TaskInsightOutputSchema = z.object({
  estimatedTimeToComplete: z.string().describe('The estimated time to complete the task.'),
  potentialDependencies: z.string().describe('Potential dependencies for the task.'),
  additionalNotes: z.string().describe('Any additional notes or considerations for the task.'),
});
export type TaskInsightOutput = z.infer<typeof TaskInsightOutputSchema>;

export async function provideTaskInsight(input: TaskInsightInput): Promise<TaskInsightOutput> {
  return provideTaskInsightFlow(input);
}

const prompt = ai.definePrompt({
  name: 'taskInsightPrompt',
  input: {schema: TaskInsightInputSchema},
  output: {schema: TaskInsightOutputSchema},
  prompt: `You are a personal task management assistant. You will provide insights to the user for a given task in their to-do list such as the estimated time to complete, potential dependencies and additional notes.

  Task: {{{task}}}
  Task List: {{{taskList}}}
  \n\
  Provide your response in a detailed paragraph format.
  `,
});

const provideTaskInsightFlow = ai.defineFlow(
  {
    name: 'provideTaskInsightFlow',
    inputSchema: TaskInsightInputSchema,
    outputSchema: TaskInsightOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
