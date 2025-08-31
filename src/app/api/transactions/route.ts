import { getStore } from '@netlify/blobs';
import { NextRequest, NextResponse } from 'next/server';
import type { Transaction } from '@/lib/types';

const STORE_NAME = 'transactions_store';

// GET all transactions
export async function GET() {
  const store = getStore(STORE_NAME);
  try {
    const { blobs } = await store.list();
    const transactions: Transaction[] = [];
    for (const blob of blobs) {
        const data = await store.get(blob.key, { type: 'json' });
        transactions.push(data as Transaction);
    }
    // Sort transactions by date, most recent first
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return NextResponse.json({ transactions });
  } catch (error) {
    return NextResponse.json({ message: 'Failed to retrieve transactions.', error }, { status: 500 });
  }
}

// POST a new transaction
export async function POST(request: NextRequest) {
  const store = getStore(STORE_NAME);
  try {
    const body = await request.json();
    const newTransaction: Transaction = {
      ...body,
      id: crypto.randomUUID(),
      date: new Date(body.date).toISOString(),
    };
    
    await store.setJSON(newTransaction.id, newTransaction);
    
    return NextResponse.json(newTransaction, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: 'Failed to create transaction.', error }, { status: 500 });
  }
}
