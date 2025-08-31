import { getStore } from '@netlify/blobs';
import { NextRequest, NextResponse } from 'next/server';
import type { Transaction } from '@/lib/types';

const STORE_NAME = 'transactions_store';

// A real app would have user authentication and rules
const getUserId = () => 'user123';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserId();
  const store = getStore(STORE_NAME);
  const blobKey = `transactions_${userId}`;
  
  try {
    const updatedTransaction: Transaction = await request.json();
    
    let transactions: Transaction[] = [];
    try {
        const currentData = await store.get(blobKey, { type: 'json' });
        if(Array.isArray(currentData)) {
            transactions = currentData;
        }
    } catch(error) {
        if (error instanceof Error && (error.name === 'BlobNotFoundError' || error.message.includes('Not Found'))) {
             return NextResponse.json({ message: 'Transaction database not found' }, { status: 404 });
        }
        throw error;
    }

    const transactionIndex = transactions.findIndex(t => t.id === params.id);

    if (transactionIndex === -1) {
      return NextResponse.json({ message: 'Transaction not found' }, { status: 404 });
    }

    transactions[transactionIndex] = { ...transactions[transactionIndex], ...updatedTransaction };
    await store.setJSON(blobKey, transactions);

    return NextResponse.json(updatedTransaction);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ message: 'Failed to update transaction', error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserId();
  const store = getStore(STORE_NAME);
  const blobKey = `transactions_${userId}`;

  try {
    let transactions: Transaction[] = [];
     try {
        const currentData = await store.get(blobKey, { type: 'json' });
        if(Array.isArray(currentData)) {
            transactions = currentData;
        }
    } catch(error) {
        if (error instanceof Error && (error.name === 'BlobNotFoundError' || error.message.includes('Not Found'))) {
             return NextResponse.json({ message: 'Transaction not found' }, { status: 404 });
        }
        throw error;
    }

    const updatedTransactions = transactions.filter(t => t.id !== params.id);

    if (transactions.length === updatedTransactions.length) {
       return NextResponse.json({ message: 'Transaction not found' }, { status: 404 });
    }
    
    await store.setJSON(blobKey, updatedTransactions);

    return NextResponse.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ message: 'Failed to delete transaction', error: message }, { status: 500 });
  }
}
