
'use server';

/**
 * @fileOverview This file defines a Genkit flow for creating a task list from a user prompt
 * or recognizing a command to clear the task list, mark all tasks as complete, answer a query about task count,
 * or provide a simple conversational reply.
 *
 * - createTasklist - A function that takes a user prompt and returns a structured to-do list or signals an action/query/conversational response.
 * - CreateTaskListInput - The input type for the createTasklist function.
 * - CreateTaskListOutput - The return type for the createTasklist function, including a possible 'action'.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

/**
 * Defines the input schema for the task creation flow.
 * @property {string} prompt - A user's natural language request for tasks or a command.
 * @property {number} [currentTaskCount] - The current number of tasks the user has. Used for queries about task count. This might be slightly delayed from the absolute current count if tasks were just added client-side.
 */
const CreateTaskListInputSchema = z.object({
  prompt: z.string().describe('A prompt describing the tasks to be included in the to-do list, or a command like "delete all tasks", "complete all tasks", "how many tasks do I have?", or a simple greeting like "hello".'),
  currentTaskCount: z.number().optional().describe('The current number of tasks the user has. Used for queries about task count. This might be slightly delayed from the absolute current count if tasks were just added client-side.'),
});
export type CreateTaskListInput = z.infer<typeof CreateTaskListInputSchema>;

/**
 * Defines the output schema for the task creation flow.
 * @property {string[]} taskList - The generated list of tasks. Empty if 'clear_all_tasks', 'complete_all_tasks', 'query_task_count', or 'no_action_conversational_reply' action is specified.
 * @property {string} [reasoning] - A friendly message to the user explaining the result or any issues.
 * @property {"add_tasks" | "clear_all_tasks" | "complete_all_tasks" | "query_task_count" | "no_action_conversational_reply"} [action] - The intended action, query type, or reply type based on the prompt. Defaults to 'add_tasks'.
 */
const CreateTaskListOutputSchema = z.object({
  taskList: z.array(z.string()).describe('An array of task strings. Contains tasks if action is "add_tasks", or an empty array if action is "clear_all_tasks", "complete_all_tasks", "query_task_count", "no_action_conversational_reply", or if no tasks were generated.'),
  reasoning: z.string().optional().describe('A brief, friendly message for the user, summarizing what was done, answering a query, providing a conversational reply, or explaining any issues encountered.'),
  action: z.enum(["add_tasks", "clear_all_tasks", "complete_all_tasks", "query_task_count", "no_action_conversational_reply"]).optional().describe("The intended action, query type, or reply type based on the prompt. Defaults to 'add_tasks' if not specified or if the prompt is for task creation."),
});
export type CreateTaskListOutput = z.infer<typeof CreateTaskListOutputSchema>;

/**
 * A wrapper function that executes the Genkit flow to create a task list or process a command/query/greeting.
 * This provides a clean, standard async function interface for consumers.
 * @param {CreateTaskListInput} input - The user's prompt and optionally the current task count.
 * @returns {Promise<CreateTaskListOutput>} A promise that resolves to the structured task list or action/query/greeting response.
 */
export async function createTasklist(input: CreateTaskListInput): Promise<CreateTaskListOutput> {
  return createTasklistFlow(input);
}

const prompt = ai.definePrompt({
  name: 'createTaskListPrompt',
  input: {schema: CreateTaskListInputSchema},
  output: {schema: CreateTaskListOutputSchema},
  prompt: `
You are an expert personal assistant that converts user requests into structured to-do lists OR recognizes specific commands OR answers specific queries OR provides simple conversational replies.

Your main goal is to determine the user's intent based on their prompt.
The user might provide 'currentTaskCount' which is the number of tasks they currently have. This count might be slightly stale if tasks were just added on the client.

**Output Structure:**
You MUST respond with a JSON object adhering to the 'CreateTaskListOutputSchema'.
The schema includes:
- 'taskList': An array of strings.
- 'reasoning': A message for the user.
- 'action': (Optional) An enum that can be "add_tasks", "clear_all_tasks", "complete_all_tasks", "query_task_count", or "no_action_conversational_reply".

**Core Logic & Rules (Evaluate in this order of precedence):**

1.  **Command Detection - Clear List (Highest Precedence):**
    *   If the user's prompt very clearly and directly indicates a desire to delete, clear, or remove all tasks from their list (e.g., "delete all tasks", "clear all my tasks", "remove every task", "empty my list", "clear all task", "clear all the task", "delete all the tasks", "nuke my list", "clear my tasks", "delete my tasks", "wipe tasks"):
        *   Set the 'action' field to "clear_all_tasks". This is MANDATORY.
        *   The 'taskList' field MUST be an empty array (\`[]\`).
        *   The 'reasoning' field should confirm the command, e.g., "Okay, I've processed your request to clear all tasks. Your list will be emptied."
    *   **Crucially: Do NOT** create a task named "Delete all tasks", "Clear all tasks", or similar if the intent is to clear the list. This rule overrides all other rules if a clear command is detected.

2.  **Command Detection - Mark All Tasks Complete (High Precedence):**
    *   If the user's prompt clearly indicates a desire to mark all tasks as completed (e.g., "make all tasks completed", "complete all tasks", "mark all as done", "finish all tasks", "mark all tasks as complete", "make all the task as completed", "complete every task", "mark everything as done", "all tasks done"):
        *   Set the 'action' field to "complete_all_tasks". This is MANDATORY.
        *   The 'taskList' field MUST be an empty array (\`[]\`).
        *   The 'reasoning' field should confirm the command, e.g., "Okay, I've processed your request to mark all tasks as completed. Your tasks will be updated."
    *   **Crucially: Do NOT** create a task named "Mark all tasks completed" or similar if the intent is to complete all tasks. This rule is very important.

3.  **Conversational Greeting Detection (High Precedence):**
    *   If the user's prompt is a simple, common greeting or conversational opener like "hi", "hello", "hey", "how are you", "what's up", "good morning", "good afternoon", "good evening":
        *   Set the 'action' field to "no_action_conversational_reply". This is MANDATORY.
        *   The 'taskList' field MUST be an empty array (\`[]\`).
        *   The 'reasoning' field should be a short, polite, and friendly acknowledgment. Examples: "Hello! How can I help you with your tasks today?", "I'm doing well, thanks! Ready to tackle some tasks?", "Hi there! What can I do for you regarding your to-do list?"
    *   Do NOT create a task from these greetings.

4.  **Query - Task Count (Informational - Strict Matching):**
    *   If the user's prompt is a question *specifically* asking for the number or quantity of tasks they have (e.g., "how many tasks do I have?", "what is my task count?", "tell me my task count", "how many todos?", "how many task i have", "how many tsk i have?", "count my tasks"):
        *   The 'action' field in your JSON output MUST BE "query_task_count". This is MANDATORY for this rule.
        *   The 'taskList' field MUST be an empty array (\`[]\`).
        *   The 'reasoning' field MUST be exactly the string: "You're asking about your task count. The application will provide this information." The application uses this specific string internally when the action is "query_task_count", but will display a different message to the user with the actual count. Your role is to provide this exact string for reasoning if this rule is matched.
    *   Do NOT create a task like "How many tasks do I have". This is an informational query. Ensure 'action' is "query_task_count". This rule is very important for the application to function correctly.
    *   Queries like "what is my first task" or "details about task X" do NOT fall under this rule.

5.  **Single Conceptual Task Identification (Action: "add_tasks"):**
    *   If the prompt is NOT a command, greeting, or query (as per Rules 1, 2, 3 or 4), AND it describes a single conceptual task (e.g., "buy milk", "get ingredients for a cake", "write a blog post about AI", "plan a 3-day trip to Rome", "i want to make chicken"):
        *   Set the 'action' field to "add_tasks" (or omit it, as "add_tasks" is the default).
        *   The 'taskList' output should contain **ONLY ONE** string. This string should be a concise, actionable rephrasing of the user's request, ideally starting with a verb and properly capitalized.
        *   Examples:
            *   User: "buy milk" -> AI \`taskList\` output: \`["Buy milk"]\`
            *   User: "i want to make chicken" -> AI \`taskList\` output: \`["Make chicken"]\`
            *   User: "need to get some bread from the store" -> AI \`taskList\` output: \`["Get bread from the store"]\`
            *   User: "research quantum computing" -> AI \`taskList\` output: \`["Research quantum computing"]\`
        *   The 'reasoning' field should be like: "Okay, I've added '[Rephrased Task Name]' to your list. You can get more details or a breakdown using the info button!"
    *   Do NOT break down a single conceptual task into multiple items in the 'taskList'. The 'info' button for that task will handle detailed breakdowns.

6.  **Multiple Distinct Tasks Intent (Action: "add_tasks"):**
    *   If the prompt is NOT a command, greeting, or query (as per Rules 1, 2, 3 or 4), AND it explicitly asks for a plan involving several separate items, or lists multiple distinct actions:
        *   Set the 'action' field to "add_tasks" (or omit it).
        *   Break it down into a 'taskList' with multiple strings. Each string should be a distinct task.
        *   Example: User: "plan my week" -> \`taskList\`: \`["Review weekly goals", "Schedule key meetings", "Allocate time for deep work"]\`, \`action\`: \`"add_tasks"\`
        *   The 'reasoning' field should be like: "Alright, I've drafted a plan with [Number] tasks for you!"

7.  **Random/Generic Task Generation (Action: "add_tasks"):**
    *   If the prompt is NOT a command, greeting, or query (as per Rules 1, 2, 3 or 4), AND the user asks for a specific number of random, generic, or example tasks (e.g., "give me 10 random tasks", "generate 5 sample tasks", "create 3 tasks for today"):
        *   Set the 'action' field to "add_tasks" (or omit it).
        *   Your 'taskList' output MUST contain that many placeholder tasks, like "Random Task 1", "Random Task 2", etc.
        *   Example: User: "give me 3 random tasks" -> AI \`taskList\`: \`["Random Task 1", "Random Task 2", "Random Task 3"]\`, \`action\`: \`"add_tasks"\`
        *   The 'reasoning' field should be like: "Alright, I've drafted a plan with [Number] tasks for you!"

8.  **Ambiguous Prompts (Default to "add_tasks" - Single Task):**
    *   If the prompt is NOT a command, greeting, or query (as per Rules 1, 2, 3 or 4), AND it is ambiguous or unclear for list generation (and doesn't fit rules 5, 6, or 7):
        *   Set the 'action' field to "add_tasks" (or omit it).
        *   The 'taskList' MUST contain **EXACTLY ONE** string. This string should be the user's full prompt, but try to capitalize it properly (e.g., "whats is in my first task" becomes "Whats is in my first task").
        *   The 'reasoning' field should be: "I've created a task based on your input: '[User's Full Prompt capitalized]'. If this wasn't what you meant, try rephrasing or use the info button for more options."
    *   **Do NOT** generate multiple identical tasks from such an input. The taskList must contain only one item. For example, if user says "what is my first task", the taskList should be \`["What is my first task"]\`.

**User Input:**
Prompt: "{{{prompt}}}"
{{#if currentTaskCount}}User's client reported task count: {{{currentTaskCount}}} (may be slightly stale for task count queries){{/if}}

**Instructions:**
Respond STRICTLY with a valid JSON object that adheres to the 'CreateTaskListOutputSchema' format.
Ensure 'taskList' is always an array of strings.
Set the 'action' field appropriately based on the rules above. If no specific command, greeting, or query is detected or the intent is task creation, 'action' should be "add_tasks" or can be omitted.
Prioritize Rules 1, 2, 3 and 4 for command/greeting/query detection.
For Rule 4 (Task Count Query), it is CRITICAL that the 'action' field is set to "query_task_count" and the 'reasoning' field is exactly "You're asking about your task count. The application will provide this information.".
For Rule 3 (Greeting), it is CRITICAL that 'action' is "no_action_conversational_reply".
For Rule 8 (Ambiguous Prompts), it is CRITICAL that 'taskList' contains only ONE item.
These prioritizations are essential for correct application behavior.
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

      let taskList = output?.taskList && Array.isArray(output.taskList) ? output.taskList : [];
      let reasoning = output?.reasoning;
      const action = output?.action || "add_tasks";

      // Post-processing to enforce single task for Rule 8 if AI misbehaves
      if (action === "add_tasks" && taskList.length > 1) {
        const promptLowerTrimmed = input.prompt.trim().toLowerCase();
        // Check if all tasks, when trimmed and lowercased, match the trimmed and lowercased prompt
        const allTasksMatchPrompt = taskList.every(task => task.trim().toLowerCase() === promptLowerTrimmed);
        
        if (allTasksMatchPrompt && taskList.length > 0) {
           console.warn(`AI returned multiple identical tasks matching the prompt. Reducing to one. Prompt: "${input.prompt}", Original TaskList: ${JSON.stringify(taskList)}`);
           // Ensure the single task is also trimmed and uses the first (potentially capitalized) version
           taskList = [taskList[0].trim()]; 
        } else {
            // More general check: if all tasks in the list are identical to each other (even if not matching the prompt directly),
            // and the prompt was short/simple, it might be a misapplication of Rule 5 or 6.
            const uniqueTasks = Array.from(new Set(taskList.map(t => t.trim())));
            if (uniqueTasks.length === 1 && taskList.length > 1) {
                // A simple heuristic: if the prompt doesn't contain obvious list indicators like "and", ",", "plan", "list of"
                // and the AI produced multiple identical tasks, it's likely an error.
                const seemsLikeSingleRequest = !/(\band\b|,|plan|list of)/i.test(input.prompt);
                if (seemsLikeSingleRequest) {
                    console.warn(`AI returned multiple identical tasks for a prompt that seems to be a single request. Reducing to one. Prompt: "${input.prompt}", Original TaskList: ${JSON.stringify(taskList)}`);
                    taskList = [uniqueTasks[0]]; // uniqueTasks are already trimmed
                }
            }
        }
      }


      if (!reasoning) {
        if (action === "clear_all_tasks") {
          reasoning = "Okay, I've processed your request to clear all tasks. Your list will be emptied.";
        } else if (action === "complete_all_tasks") {
          reasoning = "Okay, I've processed your request to mark all tasks as completed. Your tasks will be updated accordingly.";
        } else if (action === "query_task_count") {
          reasoning = "You're asking about your task count. The application will provide this information.";
        } else if (action === "no_action_conversational_reply") {
          reasoning = "Hello! How can I help you with your tasks today?";
        } else if (taskList.length > 0 && action === "add_tasks") {
           if (taskList.length === 1) {
             // Check if this was likely a Rule 8 (ambiguous) or Rule 5 (single conceptual)
             // For Rule 8, AI should provide reasoning. If it doesn't, we construct it.
             // For Rule 5, AI should also provide reasoning.
             // This default reasoning is a fallback.
             const singleTaskText = taskList[0];
             const inputPromptTrimmedLower = input.prompt.trim().toLowerCase();
             const taskTextTrimmedLower = singleTaskText.trim().toLowerCase();
             // Attempt to create a "properly capitalized" version from the input prompt for comparison for Rule 8.
             // This is a simple capitalization, more complex proper capitalization is hard.
             let capitalizedInputPrompt = input.prompt.trim();
             if (capitalizedInputPrompt.length > 0) {
                capitalizedInputPrompt = capitalizedInputPrompt.charAt(0).toUpperCase() + capitalizedInputPrompt.slice(1);
             }


             if (taskTextTrimmedLower === inputPromptTrimmedLower || singleTaskText.trim() === capitalizedInputPrompt) { // Likely Rule 8 scenario or AI capitalized the prompt as the task
                reasoning = `I've created a task based on your input: '${singleTaskText.trim()}'. If this wasn't what you meant, try rephrasing or use the info button for more options.`;
             } else { // Likely Rule 5 (single conceptual task)
                reasoning = `Okay, I've added '${singleTaskText.trim()}' to your list. You can get more details or a breakdown using the info button!`;
             }
          } else { // Rule 6 or 7 (multiple distinct or random)
            reasoning = `Alright, I've drafted a plan with ${taskList.length} task(s) for you!`;
          }
        } else if (taskList.length === 0 && action === "add_tasks") {
           let capitalizedPrompt = input.prompt.trim();
           if (capitalizedPrompt.length > 0) {
              capitalizedPrompt = capitalizedPrompt.charAt(0).toUpperCase() + capitalizedPrompt.slice(1);
           }
           reasoning = `I've processed your request: '${capitalizedPrompt}'. No specific tasks were generated. If you intended to create tasks, try rephrasing.`;
        } else {
          reasoning = "AI processed your request.";
          if (taskList.length > 0) reasoning += ` ${taskList.length} task(s) were affected.`;
          else if (action !== "add_tasks") reasoning += ` The action was '${action}'.`;
          else reasoning += " No tasks were generated or specific action taken. You can try rephrasing your request."
        }
      }

      // Final check: if action is not add_tasks, taskList should be empty.
      if ((action === "clear_all_tasks" || action === "complete_all_tasks" || action === "query_task_count" || action === "no_action_conversational_reply") && taskList.length > 0) {
        console.warn(`AI returned action:'${action}' but non-empty taskList. Overriding taskList to empty. Original reasoning: "${output?.reasoning}", TaskList: ${JSON.stringify(output?.taskList)}`);
        let finalReasoning = reasoning; // Use already processed/defaulted reasoning
        if (!output?.reasoning) { // If AI didn't give reasoning, use our specific defaults for these actions
            if (action === "clear_all_tasks") finalReasoning = "Okay, I've processed your request to clear all tasks. Your list will be emptied.";
            else if (action === "complete_all_tasks") finalReasoning = "Okay, I've processed your request to mark all tasks as completed.";
            else if (action === "query_task_count") finalReasoning = "You're asking about your task count. The application will provide this information.";
            else if (action === "no_action_conversational_reply") finalReasoning = "Hello! How can I help you today?";
        }
        return { taskList: [], reasoning: finalReasoning, action };
      }

      return { taskList, reasoning, action };
    } catch (error) {
      console.error("Error calling AI model in createTasklistFlow:", error);
      const errorMessage = (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string')
        ? error.message
        : 'An unknown error occurred with the AI service.';

      let userFriendlyMessage = "I'm having trouble connecting to the AI service right now. Please try again in a few moments.";
      if (errorMessage.includes('503') || errorMessage.toLowerCase().includes('overloaded') || errorMessage.toLowerCase().includes('unavailable')) {
        userFriendlyMessage = "The AI service is currently overloaded or unavailable. Please try again in a little while.";
      } else if (errorMessage.toLowerCase().includes('api key')) {
        userFriendlyMessage = "There seems to be an issue with the AI service configuration. Please contact support.";
      } else if (errorMessage.toLowerCase().includes('malformed') || errorMessage.toLowerCase().includes('parse')) {
        userFriendlyMessage = "The AI returned an unexpected response. I'll try to handle it, but you might want to rephrase your request.";
      }
      
      return {
        taskList: [],
        reasoning: userFriendlyMessage,
        action: "add_tasks" // Default to add_tasks on error to avoid breaking UI expecting taskList
      };
    }
  }
);


    