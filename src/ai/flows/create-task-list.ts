
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

/**
 * Defines the input schema for the task creation flow.
 * @property {string} prompt - A user's natural language request for tasks.
 */
const CreateTaskListInputSchema = z.object({
  prompt: z.string().describe('A prompt describing the tasks to be included in the to-do list.'),
});
export type CreateTaskListInput = z.infer<typeof CreateTaskListInputSchema>;

/**
 * Defines the output schema for the task creation flow.
 * @property {string[]} taskList - The generated list of tasks.
 * @property {string} [reasoning] - A friendly message to the user explaining the result or any issues.
 */
const CreateTaskListOutputSchema = z.object({
  taskList: z.array(z.string()).describe('An array of task strings. Contains a single task for a high-level goal, multiple tasks if the user requested a breakdown, or placeholder tasks if a random generation was requested.'),
  reasoning: z.string().optional().describe('A brief, friendly message for the user, summarizing what was done or explaining any issues encountered.'),
});
export type CreateTaskListOutput = z.infer<typeof CreateTaskListOutputSchema>;

/**
 * A wrapper function that executes the Genkit flow to create a task list.
 * This provides a clean, standard async function interface for consumers.
 * @param {CreateTaskListInput} input - The user's prompt.
 * @returns {Promise<CreateTaskListOutput>} A promise that resolves to the structured task list.
 */
export async function createTasklist(input: CreateTaskListInput): Promise<CreateTaskListOutput> {
  return createTasklistFlow(input);
}

const prompt = ai.definePrompt({
  name: 'createTaskListPrompt',
  input: {schema: CreateTaskListInputSchema},
  output: {schema: CreateTaskListOutputSchema},
  prompt: `
You are an expert personal assistant that converts user requests into structured to-do lists.

Your main goal is to determine the user's intent based on their prompt.

**Core Logic & Rules:**

1.  **Single Conceptual Task Identification:**
    *   If the user's prompt describes a single conceptual task, even if it implies multiple steps or items (e.g., "buy milk", "get ingredients for a cake", "write a blog post about AI", "plan a 3-day trip to Rome"), the 'taskList' output should contain **ONLY ONE** string representing that main task. For example:
        *   User: "buy milk" -> AI \`taskList\` output: \`["Buy milk"]\`
        *   User: "get ingredients for a cake" -> AI \`taskList\` output: \`["Get ingredients for a cake"]\` (The actual ingredients will be detailed if the user requests insights for this task later).
        *   User: "write a blog post about AI" -> AI \`taskList\` output: \`["Write a blog post about AI"]\`
    *   Do NOT break down a single conceptual task into multiple items in the 'taskList'. The 'info' button for that task will handle detailed breakdowns (like ingredients or sub-steps).

2.  **Multiple Distinct Tasks Intent:**
    *   If the user's prompt explicitly asks for a plan involving several separate items, or lists multiple distinct actions, break it down into a 'taskList' with multiple strings.
    *   **Examples:**
        *   User: "plan my week" -> \`["Review weekly goals", "Schedule key meetings", "Allocate time for deep work"]\`
        *   User: "morning routine" -> \`["Wake up and stretch", "Meditate for 10 minutes", "Prepare breakfast"]\`
        *   User: "get ready for the party" -> \`["Buy a gift", "Pick up dry cleaning", "Confirm RSVP"]\`

3.  **Random/Generic Task Generation:**
    *   If the user asks for a specific number of random, generic, or example tasks (e.g., "give me 10 random tasks", "generate 5 sample tasks", "create 3 tasks for today"), your 'taskList' output MUST contain that many placeholder tasks, like "Random Task 1", "Random Task 2", etc.
    *   **Example:**
        *   User: "give me 3 random tasks" -> AI \`taskList\` output: \`["Random Task 1", "Random Task 2", "Random Task 3"]\`

**Reasoning Field Guidance:**
*   Always provide a brief, friendly, and informative message in the 'reasoning' field.
*   For a single task created: "Okay, I've added '[Task Name]' to your list. You can get more details or a breakdown using the info button!"
*   For multiple tasks created (explicitly requested or random generation): "Alright, I've drafted a plan with [Number] tasks for you!"
*   If the prompt is ambiguous or unclear for list generation: "I've created a task based on your input: '[User's Full Prompt]'. If this wasn't what you meant, try rephrasing or use the info button for more options."

**User Prompt:**
"{{{prompt}}}"

**Instructions:**
Respond STRICTLY with a valid JSON object that adheres to the 'CreateTaskListOutputSchema' format. Ensure 'taskList' is always an array of strings.
`,
});

const createTasklistFlow = ai.defineFlow(
  {
    name: 'createTasklistFlow',
    inputSchema: CreateTaskListInputSchema,
    outputSchema: CreateTaskListOutputSchema,
  },
  async input => {
    try {
      const {output} = await prompt(input);
      
      const taskList = Array.isArray(output?.taskList) ? output.taskList : [];
      const reasoning = output?.reasoning || "Here are the tasks I generated for you.";
      
      return { taskList, reasoning };
    } catch (error) {
      console.error("Error calling AI model in createTasklistFlow:", error);
      // Return a structured error response that the frontend can handle
      return {
        taskList: [],
        reasoning: "I'm having trouble connecting to the AI service right now. Please try again in a few moments."
      };
    }
  }
);
