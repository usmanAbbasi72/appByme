
'use server';

import { getStore } from '@netlify/blobs';
import { NextRequest, NextResponse } from 'next/server';
import type { Debt, Payment } from '@/lib/types';
import { headers } from 'next/headers';

const DEBTS_STORE_NAME = 'debts_store';

const getUserId = () => {
    const headersList = headers();
    const userId = headersList.get('x-user-id');
    return userId;
};

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserId();
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const store = getStore(DEBTS_STORE_NAME);
  const blobKey = `debts_${userId}`;

  try {
    const newPayment: Omit<Payment, 'id'> = await request.json();
    
    let debts: Debt[] = [];
    try {
      const currentData = await store.get(blobKey, { type: 'json' });
      if (Array.isArray(currentData)) {
        debts = currentData;
      }
    } catch (error) {
      if (error instanceof Error && (error.name === 'BlobNotFoundError' || error.message.includes('Not Found'))) {
        return NextResponse.json({ message: 'Debt database not found' }, { status: 404 });
      }
      throw error;
    }

    const debtIndex = debts.findIndex(d => d.id === params.id);
    if (debtIndex === -1) {
      return NextResponse.json({ message: 'Debt record not found' }, { status: 404 });
    }

    const debt = debts[debtIndex];

    const paymentWithId: Payment = {
        ...newPayment,
        id: crypto.randomUUID(),
    };

    if (!debt.payments) {
      debt.payments = [];
    }
    
    debt.payments.push(paymentWithId);
    
    const totalPaid = debt.payments.reduce((sum, p) => sum + p.amount, 0);
    debt.paidAmount = totalPaid;
    
    if(debt.paidAmount >= debt.amount) {
        debt.status = 'paid';
    }


    debts[debtIndex] = debt;
    await store.setJSON(blobKey, debts);

    return NextResponse.json(debt, { status: 201 });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ message: 'Failed to add payment', error: message }, { status: 500 });
  }
}

