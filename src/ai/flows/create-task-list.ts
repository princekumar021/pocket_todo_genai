
'use server';

/**
 * @fileOverview This file defines a Genkit flow for creating a task list from a user prompt
 * or recognizing a command to clear the task list, mark all tasks as complete, or answer a query about task count.
 *
 * - createTasklist - A function that takes a user prompt and returns a structured to-do list or signals an action/query response.
 * - CreateTaskListInput - The input type for the createTasklist function.
 * - CreateTaskListOutput - The return type for the createTasklist function, including a possible 'action'.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

/**
 * Defines the input schema for the task creation flow.
 * @property {string} prompt - A user's natural language request for tasks or a command.
 * @property {number} [currentTaskCount] - The current number of tasks the user has. Used for queries about task count.
 */
const CreateTaskListInputSchema = z.object({
  prompt: z.string().describe('A prompt describing the tasks to be included in the to-do list, or a command like "delete all tasks", "complete all tasks", or a query like "how many tasks do I have?".'),
  currentTaskCount: z.number().optional().describe('The current number of tasks the user has. Used for queries about task count. This might be slightly delayed from the absolute current count if tasks were just added client-side.'),
});
export type CreateTaskListInput = z.infer<typeof CreateTaskListInputSchema>;

/**
 * Defines the output schema for the task creation flow.
 * @property {string[]} taskList - The generated list of tasks. Empty if 'clear_all_tasks', 'complete_all_tasks', or 'query_task_count' action is specified.
 * @property {string} [reasoning] - A friendly message to the user explaining the result or any issues.
 * @property {"add_tasks" | "clear_all_tasks" | "complete_all_tasks" | "query_task_count"} [action] - The intended action or query type based on the prompt. Defaults to 'add_tasks'.
 */
const CreateTaskListOutputSchema = z.object({
  taskList: z.array(z.string()).describe('An array of task strings. Contains tasks if action is "add_tasks", or an empty array if action is "clear_all_tasks", "complete_all_tasks", "query_task_count", or if no tasks were generated.'),
  reasoning: z.string().optional().describe('A brief, friendly message for the user, summarizing what was done, answering a query, or explaining any issues encountered.'),
  action: z.enum(["add_tasks", "clear_all_tasks", "complete_all_tasks", "query_task_count"]).optional().describe("The intended action or query type based on the prompt. Defaults to 'add_tasks' if not specified or if the prompt is for task creation."),
});
export type CreateTaskListOutput = z.infer<typeof CreateTaskListOutputSchema>;

/**
 * A wrapper function that executes the Genkit flow to create a task list or process a command/query.
 * This provides a clean, standard async function interface for consumers.
 * @param {CreateTaskListInput} input - The user's prompt and optionally the current task count.
 * @returns {Promise<CreateTaskListOutput>} A promise that resolves to the structured task list or action/query response.
 */
export async function createTasklist(input: CreateTaskListInput): Promise<CreateTaskListOutput> {
  return createTasklistFlow(input);
}

const prompt = ai.definePrompt({
  name: 'createTaskListPrompt',
  input: {schema: CreateTaskListInputSchema},
  output: {schema: CreateTaskListOutputSchema},
  prompt: `
You are an expert personal assistant that converts user requests into structured to-do lists OR recognizes specific commands OR answers specific queries.

Your main goal is to determine the user's intent based on their prompt.
The user might provide 'currentTaskCount' which is the number of tasks they currently have. This count might be slightly stale if tasks were just added on the client.

**Output Structure:**
You MUST respond with a JSON object adhering to the 'CreateTaskListOutputSchema'.
The schema includes:
- 'taskList': An array of strings.
- 'reasoning': A message for the user.
- 'action': (Optional) An enum that can be "add_tasks", "clear_all_tasks", "complete_all_tasks", or "query_task_count".

**Core Logic & Rules (Evaluate in this order of precedence):**

1.  **Command Detection - Clear List (Highest Precedence):**
    *   If the user's prompt very clearly and directly indicates a desire to delete, clear, or remove all tasks from their list (e.g., "delete all tasks", "clear all my tasks", "remove every task", "empty my list", "clear all task", "clear all the task", "delete all the tasks", "nuke my list", "clear my tasks", "delete my tasks", "wipe tasks"):
        *   Set the 'action' field to "clear_all_tasks".
        *   The 'taskList' field MUST be an empty array (\`[]\`).
        *   The 'reasoning' field should confirm the command, e.g., "Okay, I've processed your request to clear all tasks. Your list will be emptied."
    *   **Crucially: Do NOT** create a task named "Delete all tasks", "Clear all tasks", or similar if the intent is to clear the list. This rule overrides all other rules if a clear command is detected.

2.  **Command Detection - Mark All Tasks Complete (High Precedence):**
    *   If the user's prompt clearly indicates a desire to mark all tasks as completed (e.g., "make all tasks completed", "complete all tasks", "mark all as done", "finish all tasks", "mark all tasks as complete", "make all the task as completed", "complete every task", "mark everything as done", "all tasks done"):
        *   Set the 'action' field to "complete_all_tasks".
        *   The 'taskList' field MUST be an empty array (\`[]\`).
        *   The 'reasoning' field should confirm the command, e.g., "Okay, I've processed your request to mark all tasks as completed. Your tasks will be updated."
    *   **Crucially: Do NOT** create a task named "Mark all tasks completed" or similar if the intent is to complete all tasks. This rule is very important.

3.  **Query - Task Count (Informational):**
    *   If the user's prompt is a question clearly asking for the number of tasks they have (e.g., "how many tasks do I have?", "what is my task count?", "tell me my task count", "how many todos?", "how many task i have"):
        *   Set the 'action' field to "query_task_count".
        *   The 'taskList' field MUST be an empty array (\`[]\`).
        *   The 'reasoning' field should indicate that the user is asking for the count, e.g., "You're asking about your task count. The application will provide this information." The client application will construct the final message with the actual count.
    *   Do NOT create a task like "How many tasks do I have". This is an informational query.

4.  **Single Conceptual Task Identification (Action: "add_tasks"):**
    *   If the prompt is NOT a command or query (as per Rules 1, 2, or 3), AND it describes a single conceptual task (e.g., "buy milk", "get ingredients for a cake", "write a blog post about AI", "plan a 3-day trip to Rome", "i want to make chicken"):
        *   Set the 'action' field to "add_tasks" (or omit it, as "add_tasks" is the default).
        *   The 'taskList' output should contain **ONLY ONE** string. This string should be a concise, actionable rephrasing of the user's request, ideally starting with a verb and properly capitalized.
        *   Examples:
            *   User: "buy milk" -> AI \`taskList\` output: \`["Buy milk"]\`
            *   User: "i want to make chicken" -> AI \`taskList\` output: \`["Make chicken"]\`
            *   User: "need to get some bread from the store" -> AI \`taskList\` output: \`["Get bread from the store"]\`
            *   User: "research quantum computing" -> AI \`taskList\` output: \`["Research quantum computing"]\`
        *   The 'reasoning' field should be like: "Okay, I've added '[Rephrased Task Name]' to your list. You can get more details or a breakdown using the info button!"
    *   Do NOT break down a single conceptual task into multiple items in the 'taskList'. The 'info' button for that task will handle detailed breakdowns.

5.  **Multiple Distinct Tasks Intent (Action: "add_tasks"):**
    *   If the prompt is NOT a command or query (as per Rules 1, 2, or 3), AND it explicitly asks for a plan involving several separate items, or lists multiple distinct actions:
        *   Set the 'action' field to "add_tasks" (or omit it).
        *   Break it down into a 'taskList' with multiple strings.
        *   Example: User: "plan my week" -> \`taskList\`: \`["Review weekly goals", "Schedule key meetings", "Allocate time for deep work"]\`, \`action\`: \`"add_tasks"\`
        *   The 'reasoning' field should be like: "Alright, I've drafted a plan with [Number] tasks for you!"

6.  **Random/Generic Task Generation (Action: "add_tasks"):**
    *   If the prompt is NOT a command or query (as per Rules 1, 2, or 3), AND the user asks for a specific number of random, generic, or example tasks (e.g., "give me 10 random tasks", "generate 5 sample tasks", "create 3 tasks for today"):
        *   Set the 'action' field to "add_tasks" (or omit it).
        *   Your 'taskList' output MUST contain that many placeholder tasks, like "Random Task 1", "Random Task 2", etc.
        *   Example: User: "give me 3 random tasks" -> AI \`taskList\`: \`["Random Task 1", "Random Task 2", "Random Task 3"]\`, \`action\`: \`"add_tasks"\`
        *   The 'reasoning' field should be like: "Alright, I've drafted a plan with [Number] tasks for you!"

7.  **Ambiguous Prompts (Default to "add_tasks"):**
    *   If the prompt is NOT a command or query (as per Rules 1, 2, or 3), AND it is ambiguous or unclear for list generation (and doesn't fit rules 4, 5, or 6):
        *   Set the 'action' field to "add_tasks" (or omit it).
        *   Create a single task based on the user's full prompt, but try to capitalize it.
        *   The 'reasoning' field should be: "I've created a task based on your input: '[User's Full Prompt capitalized]'. If this wasn't what you meant, try rephrasing or use the info button for more options."

**User Input:**
Prompt: "{{{prompt}}}"
{{#if currentTaskCount}}User's client reported task count: {{{currentTaskCount}}} (may be slightly stale for task count queries){{/if}}

**Instructions:**
Respond STRICTLY with a valid JSON object that adheres to the 'CreateTaskListOutputSchema' format.
Ensure 'taskList' is always an array of strings.
Set the 'action' field appropriately based on the rules above. If no specific command or query is detected or the intent is task creation, 'action' should be "add_tasks" or can be omitted.
Prioritize Rules 1, 2 and 3 for command/query detection.
`,
});

const createTasklistFlow = ai.defineFlow(
  {
    name: 'createTasklistFlow',
    inputSchema: CreateTaskListInputSchema,
    outputSchema: CreateTaskListOutputSchema,
  },
  async (input: CreateTaskListInput) => {
    try {
      const {output} = await prompt(input);
      
      const taskList = output?.taskList && Array.isArray(output.taskList) ? output.taskList : [];
      let reasoning = output?.reasoning;
      const action = output?.action || "add_tasks"; 

      if (!reasoning) {
        if (action === "clear_all_tasks") {
          reasoning = "Okay, I've processed your request to clear all tasks. Your list will be emptied.";
        } else if (action === "complete_all_tasks") {
          reasoning = "Okay, I've processed your request to mark all tasks as completed. Your tasks will be updated accordingly.";
        } else if (action === "query_task_count") {
          reasoning = "You're asking about your task count. The application will provide this information.";
        } else if (taskList.length > 0) {
           if (taskList.length === 1 && action === "add_tasks") {
            reasoning = `Okay, I've added '${taskList[0]}' to your list. You can get more details or a breakdown using the info button!`;
          } else {
            reasoning = `Alright, I've drafted a plan with ${taskList.length} task(s) for you!`;
          }
        } else {
          reasoning = "AI processed your request, but no specific tasks were generated or action taken. You can try rephrasing your request.";
        }
      }

      if ((action === "clear_all_tasks" || action === "complete_all_tasks" || action === "query_task_count") && taskList.length > 0) {
        console.warn(`AI returned action:${action} but non-empty taskList. Overriding taskList to empty.`);
        return { taskList: [], reasoning, action };
      }

      return { taskList, reasoning, action };
    } catch (error) {
      console.error("Error calling AI model in createTasklistFlow:", error);
      const errorMessage = (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string')
        ? error.message
        : 'An unknown error occurred with the AI service.';

      let userFriendlyMessage = "I'm having trouble connecting to the AI service right now. Please try again in a few moments.";
      if (errorMessage.includes('503') || errorMessage.toLowerCase().includes('overloaded')) {
        userFriendlyMessage = "The AI service is currently overloaded. Please try again in a little while.";
      } else if (errorMessage.toLowerCase().includes('api key')) {
        userFriendlyMessage = "There seems to be an issue with the AI service configuration. Please contact support.";
      }
      
      return {
        taskList: [],
        reasoning: userFriendlyMessage,
        action: "add_tasks" 
      };
    }
  }
);

