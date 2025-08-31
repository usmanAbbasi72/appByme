import { getStore } from '@netlify/blobs';
import { NextRequest, NextResponse } from 'next/server';
import type { Transaction } from '@/lib/types';

const STORE_NAME = 'transactions_store';

// In a real app, you would get this from the user's session
const getUserId = () => 'user123';

export async function GET(request: NextRequest) {
  const userId = getUserId();
  const store = getStore(STORE_NAME);
  const blobKey = `transactions_${userId}`;

  try {
    const data = await store.get(blobKey, { type: 'json' });
    // Ensure we always return an array, even if no data is present
    return NextResponse.json(data || []);
  } catch (error) {
     // If the blob doesn't exist, get() can throw an error.
     // In this case, it just means there are no transactions yet.
    if (error instanceof Error && error.message.includes('Not Found')) {
        return NextResponse.json([]);
    }
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ message: 'Failed to retrieve transactions', error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userId = getUserId();
  const store = getStore(STORE_NAME);
  const blobKey = `transactions_${userId}`;

  try {
    const newTransaction: Transaction = await request.json();
    
    // Ensure the transaction has an ID
    if (!newTransaction.id) {
        newTransaction.id = crypto.randomUUID();
    }
    
    const currentData = await store.get(blobKey, { type: 'json' }).catch(err => {
        // If the blob doesn't exist, start with an empty array.
        if (err.message.includes('Not Found')) return [];
        throw err;
    });

    const transactions: Transaction[] = Array.isArray(currentData) ? currentData : [];
    
    // Avoid adding duplicates
    if (transactions.some(t => t.id === newTransaction.id)) {
        return NextResponse.json(newTransaction, { status: 200 }); // Already exists, treat as success
    }

    transactions.push(newTransaction);
    await store.setJSON(blobKey, transactions);

    return NextResponse.json(newTransaction, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ message: 'Failed to create transaction', error: message }, { status: 500 });
  }
}
