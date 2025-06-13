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

const TaskActions = {
  ADD_TASKS: "add_tasks",
  CLEAR_ALL_TASKS: "clear_all_tasks",
  COMPLETE_ALL_TASKS: "complete_all_tasks",
  QUERY_TASK_COUNT: "query_task_count",
  NO_ACTION_REPLY: "no_action_conversational_reply"
} as const;

type TaskAction = typeof TaskActions[keyof typeof TaskActions];

/**
 * Defines the input schema for the task creation flow.
 * @property {string} prompt - A user's natural language request for tasks or a command.
 * @property {number} [currentTaskCount] - The current number of tasks the user has. Used for queries about task count. This might be slightly delayed from the absolute current count if tasks were just added client-side.
 */
const CreateTaskListInputSchema = z.object({
  prompt: z.string().describe('A prompt describing tasks or commands.'),
  currentTaskCount: z.number().optional().describe('Current task count.'),
});

/**
 * Defines the output schema for the task creation flow.
 * @property {string[]} taskList - The generated list of tasks. Empty if 'clear_all_tasks', 'complete_all_tasks', 'query_task_count', or 'no_action_conversational_reply' action is specified.
 * @property {string} [reasoning] - A friendly message to the user explaining the result or any issues.
 * @property {"add_tasks" | "clear_all_tasks" | "complete_all_tasks" | "query_task_count" | "no_action_conversational_reply"} [action] - The intended action, query type, or reply type based on the prompt. Defaults to 'add_tasks'.
 */
const CreateTaskListOutputSchema = z.object({
  taskList: z.array(z.string()),
  reasoning: z.string().optional(),
  action: z.enum([
    "add_tasks",
    "clear_all_tasks",
    "complete_all_tasks",
    "query_task_count",
    "no_action_conversational_reply"
  ]).optional(),
});
export type CreateTaskListInput = z.infer<typeof CreateTaskListInputSchema>;
export type CreateTaskListOutput = z.infer<typeof CreateTaskListOutputSchema>;

/**
 * A wrapper function that executes the Genkit flow to create a task list or process a command/query/greeting.
 * This provides a clean, standard async function interface for consumers.
 * @param {CreateTaskListInput} input - The user's prompt and optionally the current task count.
 * @returns {Promise<CreateTaskListOutput>} A promise that resolves to the structured task list or action/query/greeting response.
 */
export async function createTasklist(input: CreateTaskListInput): Promise<CreateTaskListOutput> {
  const result = await createTasklistFlow(input);
  return result;
}

const prompt = ai.definePrompt({
  name: 'createTaskListPrompt',
  input: {schema: CreateTaskListInputSchema},
  output: {schema: CreateTaskListOutputSchema},
  prompt: `
You are a concise task management assistant. Keep all responses brief and to the point.

Your main goal is to:
1. Distinguish between task creation requests and general conversation
2. Only create tasks when explicitly requested
3. Keep ALL responses under 150 characters
4. Never repeat characters or words unnecessarily
5. Give clear, concise, and professional responses
6. Default to short conversational replies unless tasks are clearly requested

For task completion and count queries:
- Detect phrases like "mark all as done", "complete everything", "finish all tasks"
- Detect phrases like "how many tasks", "task count", "tasks remaining", "completed tasks", "tasks done"
- Use the "complete_all_tasks" action for completion commands
- Use the "query_task_count" action for count queries
- When user asks about completed tasks specifically, include "completed" in the reasoning

**Output Structure:**
- taskList: Array of task strings
- reasoning: Brief, one-line message
- action: One of:
  * "add_tasks" - Creating new tasks
  * "clear_all_tasks" - Clearing all tasks
  * "complete_all_tasks" - Completing all tasks
  * "query_task_count" - Asking about task count
  * "no_action_conversational_reply" - Brief replies

**Action Rules:**

1. Task Creation Detection:
   - Create tasks when user asks to create/add/make/schedule tasks
   - Look for task-creation phrases: "create task", "add task", "make a list", "schedule my day"
   - Detect scheduling requests with time mentions (e.g., "wake up at 9 AM")
   - When in doubt about task creation, ask for clarification

2. Conversation Detection:
   - Treat greetings as conversation ("hi", "hey", "hello", "how are you")
   - Treat questions as conversation unless explicitly about tasks
   - Treat statements without clear task intent as conversation
   - Always use "no_action_conversational_reply" for conversation

3. Multiple Tasks Detection (only when task creation is requested):
   - Split lists (commas, and, numbers)
   - Break down complex items into subtasks
   - Keep each task brief and clear

2. Response Format:
   - Each task should be 2-7 words
   - Reasoning message max 50 characters
   - Clear, actionable language

Examples:

Input: "hey how are you" or "hello"
{
  "action": "no_action_conversational_reply",
  "taskList": [],
  "reasoning": "Hi there! I'm doing great, thanks for asking. How can I help you today?"
}

Input: "Can you schedule my day I wake up at 9 AM and sleep at 1 AM"
{
  "action": "add_tasks",
  "taskList": [
    "Wake up at 9:00 AM",
    "Plan morning routine",
    "Schedule day activities",
    "Prepare for bedtime at 1:00 AM"
  ],
  "reasoning": "Created daily schedule tasks"
}

Input: "what can you do?" or "what should I do today?"
{
  "action": "no_action_conversational_reply",
  "taskList": [],
  "reasoning": "I can help create task lists and daily schedules. Just tell me what you'd like to plan!"
}

Input: "create tasks for optics and electrostatics" or "Optics electrostatics"
{
  "action": "add_tasks",
  "taskList": [
    "Study optical phenomena",
    "Learn electrostatic forces",
    "Practice optics problems",
    "Review electrostatic fields"
  ],
  "reasoning": "Created focused physics study tasks"
}

Input: "create a task list for my trip to japan" or "I need to make tasks for japan trip"
{
  "action": "add_tasks",
  "taskList": [
    "Book flights",
    "Reserve hotels",
    "Plan itinerary",
    "Check passport"
  ],
  "reasoning": "Created 4 travel planning tasks"
}

Input: "physics concepts to study"
{
  "action": "no_action_conversational_reply",
  "taskList": [],
  "reasoning": "Would you like me to create specific tasks for physics concepts? Just say 'create tasks for' followed by the topics."
}

Input: "create tasks for optics and electrostatics"
{
  "action": "add_tasks",
  "taskList": [
    "Study optics fundamentals",
    "Practice electrostatics problems",
    "Review electric fields",
    "Learn optical phenomena"
  ],
  "reasoning": "Created tasks for optics and electrostatics"
}

**User Input:**
Prompt: "{{{prompt}}}"
{{#if currentTaskCount}}Tasks: {{{currentTaskCount}}}{{/if}}

Keep all responses concise and actionable.`
});

const createTasklistFlow = ai.defineFlow({
  name: 'createTasklistFlow',
  inputSchema: CreateTaskListInputSchema,
  outputSchema: CreateTaskListOutputSchema,
}, async (input) => {
  try {
    const {output} = await prompt(input);
    
    if (!output) {
      return {
        taskList: [],
        reasoning: "Could not process the request. Please try again.",
        action: "no_action_conversational_reply" as const
      };
    }

    let taskList = output.taskList || [];
    let reasoning = output.reasoning || "Task processing completed.";
    let processedAction = output.action || "no_action_conversational_reply";

    // Detect delete/clear tasks command
    const clearCommands = [
      'delete all',
      'clear all',
      'remove all',
      'delete tasks',
      'clear tasks',
      'remove tasks'
    ];
    if (clearCommands.some(cmd => input.prompt.toLowerCase().includes(cmd))) {
      return {
        taskList: [],
        reasoning: "Clearing all tasks from your list.",
        action: "clear_all_tasks" as const
      };
    }

    // Detect task count queries
    const countQueries = [
      'how many',
      'task count',
      'number of',
      'tasks left',
      'remaining tasks',
      'tasks do i have',
      'tasks i have'
    ];
    if (countQueries.some(query => input.prompt.toLowerCase().includes(query))) {
      return {
        taskList: [],
        reasoning: input.prompt.toLowerCase().includes('complete') ? "query:completed" : "query:total",
        action: "query_task_count" as const
      };
    }

    // Detect scheduling and planning requests
    const isSchedulingRequest = input.prompt.toLowerCase().includes('schedule') || 
                               (input.prompt.toLowerCase().includes('wake up') && 
                                input.prompt.toLowerCase().includes('sleep'));
    
    if (isSchedulingRequest) {
      const wakeTimeMatch = input.prompt.match(/wake up at (\d{1,2}(?::\d{2})?\s*[AaPp][Mm])/);
      const sleepTimeMatch = input.prompt.match(/sleep at (\d{1,2}(?::\d{2})?\s*[AaPp][Mm])/);
      
      const wakeTime = wakeTimeMatch ? wakeTimeMatch[1] : '9:00 AM';
      const sleepTime = sleepTimeMatch ? sleepTimeMatch[1] : '1:00 AM';
      
      taskList = [
        `Wake up at ${wakeTime}`,
        'Brush teeth and freshen up',
        'Morning exercise routine',
        'Breakfast time',
        'Start daily work/study',
        'Lunch break',
        'Continue work/study',
        'Evening relaxation',
        'Dinner time',
        'Evening routine',
        `Prepare for bed by ${sleepTime}`
      ];
      
      reasoning = 'Created a daily schedule for you';
      processedAction = 'add_tasks';
    }

    // Check if this is a greeting or conversational input
    const isGreeting = input.prompt.toLowerCase().match(/\b(hi|hey|hello|greetings|how are you)\b/);
    if (isGreeting) {
      return {
        taskList: [],
        reasoning: "Hi! I'm here to help with your tasks. What would you like to do?",
        action: "no_action_conversational_reply" as const
      };
    }

    // Check if this is a direct topic mention without explicit task creation request
    const hasTaskWords = input.prompt.toLowerCase().match(/\b(task|tasks|todo|todos|schedule|plan)\b/);
    const isDirectTopic = !input.prompt.toLowerCase().includes('create') && 
                         !input.prompt.toLowerCase().includes('add') &&
                         !input.prompt.toLowerCase().includes('make') &&
                         !input.prompt.toLowerCase().includes('need') &&
                         !input.prompt.toLowerCase().includes('schedule');
                         
    if (isDirectTopic && !isGreeting && hasTaskWords) {
      return {
        taskList: [],
        reasoning: "Would you like me to create tasks for these topics? Just say 'create tasks for' followed by the topics.",
        action: "no_action_conversational_reply" as const
      };
    }

    // Post-process tasks if we're adding them
    if (processedAction === "add_tasks" && taskList.length > 0) {
      // Clean up tasks
      taskList = taskList
        .map(task => task.trim())
        .filter(task => task.length > 0)
        .map(task => task.charAt(0).toUpperCase() + task.slice(1));

      // Remove duplicates while preserving order
      taskList = Array.from(new Set(taskList));

      // Update reasoning if none provided
      if (!output.reasoning) {
        reasoning = taskList.length === 1
          ? `Added task: "${taskList[0]}"`
          : `Created ${taskList.length} tasks for you!`;
      }
    } else if (processedAction === "no_action_conversational_reply") {
      // Ensure conversational replies are concise and not repetitive
      if (!output.reasoning || output.reasoning.length > 150) {
        reasoning = "I can help you create and manage task lists. What would you like to do?";
      }
    } else if (processedAction === "complete_all_tasks") {
      // Reasoning for completing all tasks will be overridden by client-side logic
      // to reflect actual state changes
      reasoning = output.reasoning || "Processing request to complete all tasks...";
    } else if (processedAction === "query_task_count") {
      // Analyze the query type from input and pass it through reasoning
      const query = input.prompt.toLowerCase();
      const isRemainingQuery = query.includes("need to") || 
                              query.includes("left to") ||
                              query.includes("still have to");
      const isCompletedQuery = query.includes("completed") || 
                              query.includes("finished");
      
      reasoning = isRemainingQuery ? "query:remaining" :
                 isCompletedQuery ? "query:completed" : "query:total";
    }

    return { taskList, reasoning, action: processedAction };
  } catch (error) {
    console.error('Error in createTasklistFlow:', error);
    return {
      taskList: [],
      reasoning: "An error occurred while processing your request. Please try again.",
      action: "no_action_conversational_reply" as const
    };
  }
});

