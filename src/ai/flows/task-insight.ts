
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
  taskList: z.string().describe('The list containing the task, providing context.'),
});
export type TaskInsightInput = z.infer<typeof TaskInsightInputSchema>;

const TaskInsightOutputSchema = z.object({
  estimatedTimeToComplete: z.string().describe('The estimated time to complete the task (e.g., "approx. 1 hour", "2-3 days").'),
  potentialDependencies: z.string().describe('Potential dependencies for the task based on the task itself and the broader task list.'),
  additionalNotes: z.string().describe('Any additional notes, considerations, or a general summary of the insight.'),
  subTasks: z.array(z.string()).optional().describe('A list of sub-tasks, ingredients, or breakdown steps, if applicable to the main task. For example, ingredients for a recipe or steps for a project.'),
});
export type TaskInsightOutput = z.infer<typeof TaskInsightOutputSchema>;

export async function provideTaskInsight(input: TaskInsightInput): Promise<TaskInsightOutput> {
  return provideTaskInsightFlow(input);
}

const prompt = ai.definePrompt({
  name: 'taskInsightPrompt',
  input: {schema: TaskInsightInputSchema},
  output: {schema: TaskInsightOutputSchema},
  prompt: `You are a helpful task management assistant. For the given task, provide detailed insights.

Task: {{{task}}}
Context of other tasks in the list (if any): {{{taskList}}}

Please analyze the task and provide the following information in the structured output format:
1.  'estimatedTimeToComplete': Estimate the time required to complete this task (e.g., "approx. 45 minutes", "about 2 hours", "1-2 days").
2.  'potentialDependencies': Identify any potential dependencies this task might have, considering the task itself and the overall task list.
3.  'subTasks':
    *   If the task is a recipe (e.g., "make chicken soup", "bake a chocolate cake"), list the main ingredients as sub-tasks.
    *   If the task is a project, a learning goal, or something that can be broken down into smaller steps (e.g., "write a research paper on AI", "learn basics of quantum physics", "plan a 15-day study schedule for DSC"), list the key actionable steps or components as sub-tasks.
    *   If no specific sub-tasks are applicable or the task is too simple, leave this field empty or undefined.
4.  'additionalNotes': Provide any other relevant notes, considerations, a brief summary of the task's nature, or helpful tips.

Ensure your response strictly adheres to the requested output schema.
  `,
});

const provideTaskInsightFlow = ai.defineFlow(
  {
    name: 'provideTaskInsightFlow',
    inputSchema: TaskInsightInputSchema,
    outputSchema: TaskInsightOutputSchema,
  },
  async (input): Promise<TaskInsightOutput> => {
    try {
      const {output} = await prompt(input);
      if (!output) {
        console.warn("AI returned no output for task insight for task:", input.task);
        return {
          estimatedTimeToComplete: "Not available",
          potentialDependencies: "Not available",
          additionalNotes: "AI could not provide specific insights for this task at the moment.",
          subTasks: [],
        };
      }
      return output;
    } catch (error) {
      console.error("Error calling AI model in provideTaskInsightFlow:", error);
      return {
        estimatedTimeToComplete: "Error",
        potentialDependencies: "Error",
        additionalNotes: "I'm having trouble connecting to the AI service for insights. Please try again in a few moments.",
        subTasks: [],
      };
    }
  }
);

