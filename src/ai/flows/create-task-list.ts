
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
  taskList: z.array(z.string()).describe('A structured to-do list generated from the user prompt. If the user\'s prompt describes a single conceptual task (e.g., "buy milk", "get ingredients for a cake"), this list should contain ONLY ONE string for that main task. If the prompt asks for multiple distinct tasks (e.g., "plan my weekend"), then this list will contain those multiple tasks.'),
  reasoning: z.string().optional().describe('A brief, friendly message for the user, summarizing what was done or confirming success. e.g., "Okay, I\'ve added \'Get ingredients for cake\' to your list. You can get more details using the info button!" or "Here are some tasks based on your request."'),
});
export type CreateTaskListOutput = z.infer<typeof CreateTaskListOutputSchema>;

export async function createTasklist(input: CreateTaskListInput): Promise<CreateTaskListOutput> {
  return createTasklistFlow(input);
}

const prompt = ai.definePrompt({
  name: 'createTaskListPrompt',
  input: {schema: CreateTaskListInputSchema},
  output: {schema: CreateTaskListOutputSchema},
  prompt: `You are a personal assistant. Your goal is to interpret the user's prompt and decide if it's a request for a single, overarching task or a request for a list of multiple distinct tasks.

User Prompt: {{{prompt}}}

1.  **Single Task Identification:**
    *   If the user's prompt describes a single conceptual task, even if it implies multiple steps or items (e.g., "buy milk", "get ingredients for a cake", "write a blog post about AI", "plan a 3-day trip to Rome"), the 'taskList' output should contain **ONLY ONE** string representing that main task. For example:
        *   User: "buy milk" -> AI \`taskList\` output: \`["Buy milk"]\`
        *   User: "get ingredients for a cake" -> AI \`taskList\` output: \`["Get ingredients for a cake"]\` (The actual ingredients will be detailed if the user requests insights for this task later).
        *   User: "write a blog post about AI" -> AI \`taskList\` output: \`["Write a blog post about AI"]\`
    *   Do NOT break down a single conceptual task into multiple items in the 'taskList'. The 'info' button for that task will handle detailed breakdowns.

2.  **Multiple Distinct Tasks Identification:**
    *   If the user's prompt clearly asks for multiple, separate, and distinct tasks (e.g., "plan my weekend: movies and dinner", "tasks for today: email boss, finish report, call mom", "my work items for the week"), then the 'taskList' output should be an array of these distinct tasks. For example:
        *   User: "plan my week" -> AI \`taskList\` output: \`["Review weekly goals", "Schedule key meetings", "Allocate time for deep work"]\`
        *   User: "things to do today and tomorrow" -> AI \`taskList\` output: \`["Task A for today", "Task B for today", "Task C for tomorrow"]\`

Provide a brief, friendly message for the user in the 'reasoning' field. This message should summarize what you did or confirm success.
*   If a single task was created, the reasoning could be: "Okay, I've added '[Task Name]' to your list. You can get more details or a breakdown using the info button!"
*   If multiple tasks were created: "Alright, I've drafted a plan with a few tasks for you!"
*   If the prompt was very short like "work": "Here's a general task based on your prompt. Feel free to ask for more details!"

Ensure your 'taskList' output is always an array of strings, adhering to the logic above.
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

