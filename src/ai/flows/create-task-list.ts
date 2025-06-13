'use server';

/**
 * @fileOverview This file defines a Genkit flow for creating a task list from a user prompt.
 *
 * - createTasklist - A function that takes a user prompt and returns a structured to-do list.
 * - CreateTaskListInput - The input type for the createTasklist function.
 * - CreateTaskListOutput - The return type for the createTasklist function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CreateTaskListInputSchema = z.object({
  prompt: z.string().describe('A prompt describing the tasks to be included in the to-do list.'),
});
export type CreateTaskListInput = z.infer<typeof CreateTaskListInputSchema>;

const CreateTaskListOutputSchema = z.object({
  taskList: z.array(z.string()).describe('A structured to-do list generated from the user prompt.'),
  reasoning: z.string().optional().describe('The AI agent internal reasoning.'),
});
export type CreateTaskListOutput = z.infer<typeof CreateTaskListOutputSchema>;

export async function createTasklist(input: CreateTaskListInput): Promise<CreateTaskListOutput> {
  return createTasklistFlow(input);
}

const prompt = ai.definePrompt({
  name: 'createTaskListPrompt',
  input: {schema: CreateTaskListInputSchema},
  output: {schema: CreateTaskListOutputSchema},
  prompt: `You are a personal assistant. Please generate a structured to-do list based on the user's prompt.  The list should be actionable and clear. The items should be concise.

User Prompt: {{{prompt}}}

To-Do List:
{{#each taskList}}- {{this}}
{{/each}}`,
});

const createTasklistFlow = ai.defineFlow(
  {
    name: 'createTasklistFlow',
    inputSchema: CreateTaskListInputSchema,
    outputSchema: CreateTaskListOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
