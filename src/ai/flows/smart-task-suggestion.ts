'use server';

/**
 * @fileOverview Provides smart task suggestions based on user input (files or URLs).
 *
 * - suggestTasks - A function that suggests relevant actions based on the input.
 * - SuggestTasksInput - The input type for the suggestTasks function.
 * - SuggestTasksOutput - The return type for the suggestTasks function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTasksInputSchema = z.object({
  input: z.string().describe('The user input, which could be a file name, data URI, or URL.'),
});
export type SuggestTasksInput = z.infer<typeof SuggestTasksInputSchema>;

const SuggestTasksOutputSchema = z.object({
  suggestedActions: z
    .array(
      z.enum([
        'convert',
        'resize',
        'generate QR code',
        'convert to PDF',
        'no action',
      ])
    )
    .describe('An array of suggested actions based on the user input.'),
  reasoning: z.string().describe('The AI reasoning behind the suggested actions.'),
});
export type SuggestTasksOutput = z.infer<typeof SuggestTasksOutputSchema>;

export async function suggestTasks(input: SuggestTasksInput): Promise<SuggestTasksOutput> {
  return suggestTasksFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTasksPrompt',
  input: {schema: SuggestTasksInputSchema},
  output: {schema: SuggestTasksOutputSchema},
  prompt: `You are a task suggestion AI.

  Based on the user input, suggest relevant actions from the following options:
  - convert
  - resize
  - generate QR code
  - convert to PDF
  - no action

  Consider the type of input (file, URL, etc.) and what actions would be most appropriate.
  Explain your reasoning.

  Input: {{{input}}}
  Output format: JSON, with \"suggestedActions\" (array of strings) and \"reasoning\" (string) fields.
  `,
});

const suggestTasksFlow = ai.defineFlow(
  {
    name: 'suggestTasksFlow',
    inputSchema: SuggestTasksInputSchema,
    outputSchema: SuggestTasksOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
