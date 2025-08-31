
import { getStore } from '@netlify/blobs';
import { NextRequest, NextResponse } from 'next/server';
import type { Debt } from '@/lib/types';
import { headers } from 'next/headers'

const STORE_NAME = 'debts_store';

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
  const blobKey = `debts_${userId}`;

  try {
    const data = await store.get(blobKey, { type: 'json' });
    return NextResponse.json(data || []);
  } catch (error) {
    if (error instanceof Error && (error.name === 'BlobNotFoundError' || error.message.includes('Not Found'))) {
        await store.setJSON(blobKey, []);
        return NextResponse.json([]);
    }
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ message: 'Failed to retrieve debts', error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userId = getUserId();
    if (!userId) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
  const store = getStore(STORE_NAME);
  const blobKey = `debts_${userId}`;

  try {
    const newDebt: Debt = await request.json();
    
    if (!newDebt.id) {
        newDebt.id = crypto.randomUUID();
    }
    
    let debts: Debt[] = [];
    try {
        const currentData = await store.get(blobKey, { type: 'json' });
        if (Array.isArray(currentData)) {
            debts = currentData;
        }
    } catch (error) {
        if (error instanceof Error && (error.name === 'BlobNotFoundError' || error.message.includes('Not Found'))) {
            // Blob doesn't exist, we'll create it.
        } else {
            throw error;
        }
    }
    
    if (debts.some(d => d.id === newDebt.id)) {
        return NextResponse.json(newDebt, { status: 200 });
    }

    debts.push(newDebt);
    await store.setJSON(blobKey, debts);

    return NextResponse.json(newDebt, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ message: 'Failed to create debt record', error: message }, { status: 500 });
  }
}
