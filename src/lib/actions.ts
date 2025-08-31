'use server';

import * as fs from 'fs/promises';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { Transaction } from './types';
import { generateMonthlyFinancialReport } from '@/ai/flows/generate-monthly-financial-report';
import { format } from 'date-fns';

const MOCKED_USER_ID = 'user123';
const FILE_PATH = `transactions_${MOCKED_USER_ID}.txt`;

const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number().positive(),
  date: z.date(),
  reason: z.string().min(2),
  category: z.string().min(1),
  accountId: z.string().optional(),
});

const transactionUpdateSchema = transactionSchema.extend({
  id: z.string(),
});

export async function addTransaction(data: unknown) {
  const parsedData = transactionSchema.safeParse(data);
  if (!parsedData.success) {
    throw new Error('Invalid transaction data.');
  }
  const { type, amount, date, reason, category, accountId } = parsedData.data;

  const newTransaction: Transaction = {
    type,
    amount,
    date: date.toISOString(),
    reason,
    category,
    accountName: accountId, // In this simple case, we use the account name as the ID
    id: crypto.randomUUID(),
  };

  try {
    const transactions = await getTransactionsFromFile();
    transactions.push(newTransaction);
    await fs.writeFile(FILE_PATH, JSON.stringify(transactions, null, 2), 'utf-8');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Failed to add transaction:', error);
    throw new Error('Failed to save transaction to file.');
  }
}

export async function updateTransaction(data: unknown) {
  const parsedData = transactionUpdateSchema.safeParse(data);
  if (!parsedData.success) {
    throw new Error('Invalid transaction data.');
  }
  
  const { id, ...updatedValues } = parsedData.data;

  try {
    const transactions = await getTransactionsFromFile();
    const transactionIndex = transactions.findIndex(t => t.id === id);

    if (transactionIndex === -1) {
      throw new Error('Transaction not found.');
    }

    transactions[transactionIndex] = {
      ...transactions[transactionIndex],
      ...updatedValues,
      date: updatedValues.date.toISOString(),
      accountName: updatedValues.accountId
    };

    await fs.writeFile(FILE_PATH, JSON.stringify(transactions, null, 2), 'utf-8');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Failed to update transaction:', error);
    throw new Error('Failed to update transaction.');
  }
}

export async function deleteTransaction(transactionId: string) {
    if (!transactionId) {
        throw new Error('Transaction ID is required.');
    }

    try {
        let transactions = await getTransactionsFromFile();
        transactions = transactions.filter(t => t.id !== transactionId);

        await fs.writeFile(FILE_PATH, JSON.stringify(transactions, null, 2), 'utf-8');
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Failed to delete transaction:', error);
        throw new Error('Failed to delete transaction.');
    }
}


async function getTransactionsFromFile(): Promise<Transaction[]> {
    try {
        await fs.access(FILE_PATH);
        const fileContent = await fs.readFile(FILE_PATH, 'utf-8');
        return JSON.parse(fileContent);
    } catch (error) {
         if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            await fs.writeFile(FILE_PATH, '[]', 'utf-8');
            return [];
         }
         console.error('Failed to read transactions file:', error);
         throw new Error('Could not read transactions.');
    }
}


export async function getTransactions(): Promise<Transaction[]> {
  try {
    const transactions = await getTransactionsFromFile();
    // Sort transactions by date, most recent first
    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error('Failed to get transactions:', error);
    return [];
  }
}

export async function generateReportAction() {
    const now = new Date();
    const month = format(now, 'MMMM');
    const year = format(now, 'yyyy');

    try {
        const report = await generateMonthlyFinancialReport({
            userId: MOCKED_USER_ID,
            month,
            year,
        });
        return report;
    } catch (error) {
        console.error("Error generating AI report:", error);
        throw new Error("Failed to communicate with the AI service.");
    }
}
