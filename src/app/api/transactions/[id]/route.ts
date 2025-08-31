import { getStore } from '@netlify/blobs';
import { NextRequest, NextResponse } from 'next/server';

const STORE_NAME = 'transactions_store';

// GET a single transaction by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const store = getStore(STORE_NAME);
  try {
    const transaction = await store.get(params.id, { type: 'json' });
    if (!transaction) {
      return NextResponse.json({ message: 'Transaction not found' }, { status: 404 });
    }
    return NextResponse.json(transaction);
  } catch (error) {
    return NextResponse.json({ message: 'Failed to retrieve transaction.', error }, { status: 500 });
  }
}

// PUT (update) a transaction
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const store = getStore(STORE_NAME);
  try {
    const body = await request.json();
    const updatedTransaction = {
      ...body,
      id: params.id,
      date: new Date(body.date).toISOString(),
    };

    await store.setJSON(params.id, updatedTransaction);

    return NextResponse.json(updatedTransaction);
  } catch (error) {
    return NextResponse.json({ message: 'Failed to update transaction.', error }, { status: 500 });
  }
}

// DELETE a transaction
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const store = getStore(STORE_NAME);
  try {
    await store.delete(params.id);
    return new NextResponse(null, { status: 204 }); // No Content
  } catch (error) {
    return NextResponse.json({ message: 'Failed to delete transaction.', error }, { status: 500 });
  }
}
