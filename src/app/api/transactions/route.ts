
import { getStore } from '@netlify/blobs';
import { NextRequest, NextResponse } from 'next/server';
import type { Transaction } from '@/lib/types';
import { headers } from 'next/headers'

const STORE_NAME = 'transactions_store';

const getUserId = () => {
    const headersList = headers();
    const userId = headersList.get('x-user-id');
    return userId;
};


export async function GET(request: NextRequest) {
  const userId = getUserId();
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const store = getStore(STORE_NAME);
  const blobKey = `transactions_${userId}`;

  try {
    const data = await store.get(blobKey, { type: 'json' });
    return NextResponse.json(data || []);
  } catch (error) {
    if (error instanceof Error && (error.name === 'BlobNotFoundError' || error.message.includes('Not Found'))) {
        await store.setJSON(blobKey, []);
        return NextResponse.json([]);
    }
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ message: 'Failed to retrieve transactions', error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userId = getUserId();
    if (!userId) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
  const store = getStore(STORE_NAME);
  const blobKey = `transactions_${userId}`;

  try {
    const newTransaction: Transaction = await request.json();
    
    if (!newTransaction.id) {
        newTransaction.id = crypto.randomUUID();
    }
    
    let transactions: Transaction[] = [];
    try {
        const currentData = await store.get(blobKey, { type: 'json' });
        if (Array.isArray(currentData)) {
            transactions = currentData;
        }
    } catch (error) {
        if (error instanceof Error && (error.name === 'BlobNotFoundError' || error.message.includes('Not Found'))) {
            // Blob doesn't exist, we'll create it.
        } else {
            throw error;
        }
    }
    
    if (transactions.some(t => t.id === newTransaction.id)) {
        return NextResponse.json(newTransaction, { status: 200 });
    }

    transactions.push(newTransaction);
    await store.setJSON(blobKey, transactions);

    return NextResponse.json(newTransaction, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ message: 'Failed to create transaction', error: message }, { status: 500 });
  }
}

    