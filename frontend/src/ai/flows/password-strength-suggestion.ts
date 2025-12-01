'use server';

/**
 * @fileOverview A password strength suggestion AI agent.
 *
 * - suggestPasswordStrength - A function that handles the password strength suggestion process.
 * - SuggestPasswordStrengthInput - The input type for the suggestPasswordStrength function.
 * - SuggestPasswordStrengthOutput - The return type for the suggestPasswordStrength function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestPasswordStrengthInputSchema = z.object({
  password: z.string().describe('The password to evaluate.'),
});
export type SuggestPasswordStrengthInput = z.infer<
  typeof SuggestPasswordStrengthInputSchema
>;

const SuggestPasswordStrengthOutputSchema = z.object({
  suggestions: z
    .string()
    .describe(
      'AI-driven suggestions for improving the password strength, if needed.'
    ),
});
export type SuggestPasswordStrengthOutput = z.infer<
  typeof SuggestPasswordStrengthOutputSchema
>;

export async function suggestPasswordStrength(
  input: SuggestPasswordStrengthInput
): Promise<SuggestPasswordStrengthOutput> {
  return suggestPasswordStrengthFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestPasswordStrengthPrompt',
  input: {schema: SuggestPasswordStrengthInputSchema},
  output: {schema: SuggestPasswordStrengthOutputSchema},
  prompt: `You are an AI assistant designed to provide suggestions for improving password strength.
  Evaluate the given password and provide suggestions for improvement if it is weak or easily guessable.
  If the password is already strong, provide a message indicating that it is secure.

  Password: {{{password}}}
  Suggestions:`,
});

const suggestPasswordStrengthFlow = ai.defineFlow(
  {
    name: 'suggestPasswordStrengthFlow',
    inputSchema: SuggestPasswordStrengthInputSchema,
    outputSchema: SuggestPasswordStrengthOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
