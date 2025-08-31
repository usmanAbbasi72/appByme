'use client';

import type { Transaction } from './types';

const TRANSACTIONS_KEY = 'transactions';

// Helper function to get transactions from localStorage
export function getTransactions(): Transaction[] {
  if (typeof window === 'undefined') {
    return [];
  }
  const transactionsJSON = localStorage.getItem(TRANSACTIONS_KEY);
  if (!transactionsJSON) {
    return [];
  }
  const transactions = JSON.parse(transactionsJSON) as Transaction[];
  // Sort transactions by date, most recent first
  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Helper function to save transactions to localStorage
function saveTransactions(transactions: Transaction[]) {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
}

export async function addTransaction(data: Omit<Transaction, 'id' | 'date'> & { date: Date }) {
  const newTransaction: Transaction = {
    ...data,
    id: crypto.randomUUID(),
    date: data.date.toISOString(),
    accountName: data.accountName, // In this simple case, we use the account name as the ID
  };

  const transactions = getTransactions();
  transactions.push(newTransaction);
  saveTransactions(transactions);

  return { success: true };
}

export async function updateTransaction(data: Omit<Transaction, 'date'> & { date: Date }) {
  const transactions = getTransactions();
  const transactionIndex = transactions.findIndex(t => t.id === data.id);

  if (transactionIndex === -1) {
    throw new Error('Transaction not found.');
  }

  transactions[transactionIndex] = {
    ...transactions[transactionIndex],
    ...data,
    date: data.date.toISOString(),
  };

  saveTransactions(transactions);
  return { success: true };
}

export async function deleteTransaction(transactionId: string) {
    if (!transactionId) {
        throw new Error('Transaction ID is required.');
    }

    let transactions = getTransactions();
    transactions = transactions.filter(t => t.id !== transactionId);

    saveTransactions(transactions);
    return { success: true };
}
