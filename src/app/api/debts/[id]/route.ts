
import { getStore } from '@netlify/blobs';
import { NextRequest, NextResponse } from 'next/server';
import type { Debt } from '@/lib/types';
import { headers } from 'next/headers';

const STORE_NAME = 'debts_store';

const getUserId = () => {
    const headersList = headers();
    const userId = headersList.get('x-user-id');
    return userId;
};

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserId();
   if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const store = getStore(STORE_NAME);
  const blobKey = `debts_${userId}`;
  
  try {
    const updatedDebt: Debt = await request.json();
    
    let debts: Debt[] = [];
    try {
        const currentData = await store.get(blobKey, { type: 'json' });
        if(Array.isArray(currentData)) {
            debts = currentData;
        }
    } catch(error) {
        if (error instanceof Error && (error.name === 'BlobNotFoundError' || error.message.includes('Not Found'))) {
             return NextResponse.json({ message: 'Debt database not found' }, { status: 404 });
        }
        throw error;
    }

    const debtIndex = debts.findIndex(d => d.id === params.id);

    if (debtIndex === -1) {
      return NextResponse.json({ message: 'Debt record not found' }, { status: 404 });
    }

    debts[debtIndex] = { ...debts[debtIndex], ...updatedDebt };
    await store.setJSON(blobKey, debts);

    return NextResponse.json(updatedDebt);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ message: 'Failed to update debt record', error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserId();
   if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const store = getStore(STORE_NAME);
  const blobKey = `debts_${userId}`;

  try {
    let debts: Debt[] = [];
     try {
        const currentData = await store.get(blobKey, { type: 'json' });
        if(Array.isArray(currentData)) {
            debts = currentData;
        }
    } catch(error) {
        if (error instanceof Error && (error.name === 'BlobNotFoundError' || error.message.includes('Not Found'))) {
             return NextResponse.json({ message: 'Debt record not found' }, { status: 404 });
        }
        throw error;
    }

    const updatedDebts = debts.filter(d => d.id !== params.id);

    if (debts.length === updatedDebts.length) {
       return NextResponse.json({ message: 'Debt record not found' }, { status: 404 });
    }
    
    await store.setJSON(blobKey, updatedDebts);

    return NextResponse.json({ message: 'Debt record deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ message: 'Failed to delete debt record', error: message }, { status: 500 });
  }
}
