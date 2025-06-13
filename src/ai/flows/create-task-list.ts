
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
  reasoning: z.string().optional().describe('A brief, friendly message for the user, summarizing what was done or confirming success. e.g., "Okay, I\'ve drafted a plan for your weekend!" or "Here are some tasks based on your request."'),
});
export type CreateTaskListOutput = z.infer<typeof CreateTaskListOutputSchema>;

export async function createTasklist(input: CreateTaskListInput): Promise<CreateTaskListOutput> {
  return createTasklistFlow(input);
}

const prompt = ai.definePrompt({
  name: 'createTaskListPrompt',
  input: {schema: CreateTaskListInputSchema},
  output: {schema: CreateTaskListOutputSchema},
  prompt: `You are a personal assistant. Based on the user's prompt, generate a structured to-do list. The list items should be actionable, clear, and concise.

User Prompt: {{{prompt}}}

After generating the taskList, provide a brief, friendly message for the user in the 'reasoning' field. This message should summarize what you did or confirm success. For example:
- If the user asked to "plan my week", reasoning could be: "Alright, I've sketched out a task list for your week!"
- If the user asked for "groceries for pasta", reasoning could be: "Here's your grocery list for making pasta!"
- If the prompt was very short like "work", reasoning could be "Here are some general work-related tasks based on your prompt."
The reasoning should be user-facing and encouraging.

To-Do List (ensure this is an array of strings for 'taskList'):
{{#each taskList}}- {{this}}
{{/each}}
`,
});

const createTasklistFlow = ai.defineFlow(
  {
    name: 'createTasklistFlow',
    inputSchema: CreateTaskListInputSchema,
    outputSchema: CreateTaskListOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    // Ensure taskList is always an array, even if AI fails to produce it or returns null/undefined
    const taskList = output?.taskList && Array.isArray(output.taskList) ? output.taskList : [];
    const reasoning = output?.reasoning || "I've generated some tasks for you!";
    return { taskList, reasoning };
  }
);

