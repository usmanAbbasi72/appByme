'use server';
/**
 * @fileOverview Generates a monthly financial report with spending insights and actionable improvements.
 *
 * - generateMonthlyFinancialReport - A function that generates the report.
 * - GenerateMonthlyFinancialReportInput - The input type for the generateMonthlyFinancialReport function.
 * - GenerateMonthlyFinancialReportOutput - The return type for the generateMonthlyFinancialReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import * as fs from 'fs';

const GenerateMonthlyFinancialReportInputSchema = z.object({
  userId: z.string().describe('The ID of the user.'),
  month: z.string().describe('The month for which to generate the report (e.g., "January").'),
  year: z.string().describe('The year for which to generate the report (e.g., "2024").'),
});
export type GenerateMonthlyFinancialReportInput = z.infer<typeof GenerateMonthlyFinancialReportInputSchema>;

const GenerateMonthlyFinancialReportOutputSchema = z.object({
  report: z.string().describe('The generated monthly financial report.'),
  actionableInsight: z.string().describe('An actionable insight to improve spending habits.'),
});
export type GenerateMonthlyFinancialReportOutput = z.infer<typeof GenerateMonthlyFinancialReportOutputSchema>;

export async function generateMonthlyFinancialReport(input: GenerateMonthlyFinancialReportInput): Promise<GenerateMonthlyFinancialReportOutput> {
  return generateMonthlyFinancialReportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMonthlyFinancialReportPrompt',
  input: {schema: GenerateMonthlyFinancialReportInputSchema},
  output: {schema: GenerateMonthlyFinancialReportOutputSchema},
  prompt: `You are a personal finance advisor. Analyze the user's financial transactions for the month of {{month}} {{year}} and provide a summary of their spending habits.
\nBased on the spending habits, suggest one actionable insight that can help the user improve their financial situation.
\nHere is the user's transaction data, which is stored in a .txt file on the user's device. This is the content of the file:
\n{{transactionData}}
\nProvide the report and the actionable insight in a clear and concise manner. The report should summarize the user's income, expenses, and top spending categories. The actionable insight should be a specific and practical suggestion that the user can implement to save money or improve their financial health.
`,
});

const generateMonthlyFinancialReportFlow = ai.defineFlow(
  {
    name: 'generateMonthlyFinancialReportFlow',
    inputSchema: GenerateMonthlyFinancialReportInputSchema,
    outputSchema: GenerateMonthlyFinancialReportOutputSchema,
  },
  async input => {
    const transactionFilePath = `transactions_${input.userId}.txt`;
    let transactionData = '';
    try {
      // Check if the file exists
      if (fs.existsSync(transactionFilePath)) {
        transactionData = fs.readFileSync(transactionFilePath, 'utf-8');
      } else {
        transactionData = 'No transaction data found.';
      }
    } catch (error) {
      console.error('Error reading transaction file:', error);
      transactionData = 'Error reading transaction data.';
    }

    const {output} = await prompt({...input, transactionData});
    return output!;
  }
);
