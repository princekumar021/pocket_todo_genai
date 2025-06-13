
'use server';

/**
 * @fileOverview This file defines a Genkit flow for creating a task list from a user prompt
 * or recognizing a command to clear the task list.
 *
 * - createTasklist - A function that takes a user prompt and returns a structured to-do list or signals an action.
 * - CreateTaskListInput - The input type for the createTasklist function.
 * - CreateTaskListOutput - The return type for the createTasklist function, including a possible 'action'.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

/**
 * Defines the input schema for the task creation flow.
 * @property {string} prompt - A user's natural language request for tasks or a command.
 */
const CreateTaskListInputSchema = z.object({
  prompt: z.string().describe('A prompt describing the tasks to be included in the to-do list, or a command like "delete all tasks".'),
});
export type CreateTaskListInput = z.infer<typeof CreateTaskListInputSchema>;

/**
 * Defines the output schema for the task creation flow.
 * @property {string[]} taskList - The generated list of tasks. Empty if a 'clear_all_tasks' action is specified.
 * @property {string} [reasoning] - A friendly message to the user explaining the result or any issues.
 * @property {"add_tasks" | "clear_all_tasks"} [action] - The intended action based on the prompt. Defaults to 'add_tasks'.
 */
const CreateTaskListOutputSchema = z.object({
  taskList: z.array(z.string()).describe('An array of task strings. Contains tasks if action is "add_tasks", or an empty array if action is "clear_all_tasks" or if no tasks were generated.'),
  reasoning: z.string().optional().describe('A brief, friendly message for the user, summarizing what was done or explaining any issues encountered.'),
  action: z.enum(["add_tasks", "clear_all_tasks"]).optional().describe("The intended action based on the prompt. Defaults to 'add_tasks' if not specified or if the prompt is for task creation."),
});
export type CreateTaskListOutput = z.infer<typeof CreateTaskListOutputSchema>;

/**
 * A wrapper function that executes the Genkit flow to create a task list or process a command.
 * This provides a clean, standard async function interface for consumers.
 * @param {CreateTaskListInput} input - The user's prompt.
 * @returns {Promise<CreateTaskListOutput>} A promise that resolves to the structured task list or action.
 */
export async function createTasklist(input: CreateTaskListInput): Promise<CreateTaskListOutput> {
  return createTasklistFlow(input);
}

const prompt = ai.definePrompt({
  name: 'createTaskListPrompt',
  input: {schema: CreateTaskListInputSchema},
  output: {schema: CreateTaskListOutputSchema},
  prompt: `
You are an expert personal assistant that converts user requests into structured to-do lists OR recognizes specific commands.

Your main goal is to determine the user's intent based on their prompt.

**Output Structure:**
You MUST respond with a JSON object adhering to the 'CreateTaskListOutputSchema'.
The schema includes:
- 'taskList': An array of strings.
- 'reasoning': A message for the user.
- 'action': (Optional) An enum that can be "add_tasks" or "clear_all_tasks".

**Core Logic & Rules:**

1.  **Command Detection - Clear List:**
    *   If the user's prompt is a very clear and direct command to "delete all tasks", "clear all tasks", "clear my list", "remove all tasks", or similar explicit phrasing for clearing the entire list:
        *   Set the 'action' field to "clear_all_tasks".
        *   The 'taskList' field MUST be an empty array (\`[]\`).
        *   The 'reasoning' field should confirm the command, e.g., "Okay, I've processed your request to clear all tasks. The list will be emptied."
    *   **Do not** create a task named "Delete all tasks".

2.  **Single Conceptual Task Identification (Action: "add_tasks"):**
    *   If the prompt describes a single conceptual task (e.g., "buy milk", "get ingredients for a cake", "write a blog post about AI", "plan a 3-day trip to Rome"), and it's NOT a clear command (like clearing the list):
        *   Set the 'action' field to "add_tasks" (or omit it, as "add_tasks" is the default).
        *   The 'taskList' output should contain **ONLY ONE** string representing that main task.
        *   Example: User: "buy milk" -> AI \`taskList\`: \`["Buy milk"]\`, \`action\`: \`"add_tasks"\`
        *   The 'reasoning' field should be like: "Okay, I've added '[Task Name]' to your list. You can get more details or a breakdown using the info button!"
    *   Do NOT break down a single conceptual task into multiple items in the 'taskList'. The 'info' button for that task will handle detailed breakdowns.

3.  **Multiple Distinct Tasks Intent (Action: "add_tasks"):**
    *   If the prompt explicitly asks for a plan involving several separate items, or lists multiple distinct actions (and is not a clear command):
        *   Set the 'action' field to "add_tasks" (or omit it).
        *   Break it down into a 'taskList' with multiple strings.
        *   Example: User: "plan my week" -> \`taskList\`: \`["Review weekly goals", "Schedule key meetings", "Allocate time for deep work"]\`, \`action\`: \`"add_tasks"\`
        *   The 'reasoning' field should be like: "Alright, I've drafted a plan with [Number] tasks for you!"

4.  **Random/Generic Task Generation (Action: "add_tasks"):**
    *   If the user asks for a specific number of random, generic, or example tasks (e.g., "give me 10 random tasks", "generate 5 sample tasks", "create 3 tasks for today"):
        *   Set the 'action' field to "add_tasks" (or omit it).
        *   Your 'taskList' output MUST contain that many placeholder tasks, like "Random Task 1", "Random Task 2", etc.
        *   Example: User: "give me 3 random tasks" -> AI \`taskList\`: \`["Random Task 1", "Random Task 2", "Random Task 3"]\`, \`action\`: \`"add_tasks"\`
        *   The 'reasoning' field should be like: "Alright, I've drafted a plan with [Number] tasks for you!"

5.  **Ambiguous Prompts (Default to "add_tasks"):**
    *   If the prompt is ambiguous or unclear for list generation and is not a clear command:
        *   Set the 'action' field to "add_tasks" (or omit it).
        *   Create a single task based on the user's full prompt.
        *   The 'reasoning' field should be: "I've created a task based on your input: '[User's Full Prompt]'. If this wasn't what you meant, try rephrasing or use the info button for more options."

**User Prompt:**
"{{{prompt}}}"

**Instructions:**
Respond STRICTLY with a valid JSON object that adheres to the 'CreateTaskListOutputSchema' format.
Ensure 'taskList' is always an array of strings.
Set the 'action' field appropriately based on the rules above. If no specific command is detected or the intent is task creation, 'action' should be "add_tasks" or can be omitted.
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
      
      const taskList = output?.taskList && Array.isArray(output.taskList) ? output.taskList : [];
      // Provide a default reasoning message if AI doesn't, tailored to the action.
      let reasoning = output?.reasoning;
      if (!reasoning) {
        if (output?.action === "clear_all_tasks") {
          reasoning = "Request to clear all tasks has been processed.";
        } else if (taskList.length > 0) {
          reasoning = `Successfully added ${taskList.length} task(s).`;
        } else {
          reasoning = "AI processed your request.";
        }
      }
      const action = output?.action || "add_tasks"; // Default to add_tasks

      return { taskList, reasoning, action };
    } catch (error) {
      console.error("Error calling AI model in createTasklistFlow:", error);
      // Return a structured error response that the frontend can handle
      return {
        taskList: [],
        reasoning: "I'm having trouble connecting to the AI service right now. Please try again in a few moments.",
        action: "add_tasks" // So frontend shows error message but doesn't try to clear list
      };
    }
  }
);
