'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Account, Transaction } from '@/lib/types';
import { useLocalStorage } from '@/hooks/use-local-storage';

import { Header } from '@/components/Header';
import { TransactionList } from '@/components/TransactionList';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Wifi, WifiOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TransactionForm } from '@/components/TransactionForm';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

type SyncOperation =
  | { type: 'add'; payload: Transaction }
  | { type: 'update'; payload: Transaction }
  | { type: 'delete'; payload: { id: string } };

export default function Home() {
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('transactions', []);
  const [accounts, setAccounts] = useLocalStorage<Account[]>('accounts', []);
  const [syncQueue, setSyncQueue] = useLocalStorage<SyncOperation[]>('syncQueue', []);

  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false); // Default to offline until checked
  const [isSyncing, setIsSyncing] = useState(false);

  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const { toast } = useToast();

  const isSyncingRef = useRef(isSyncing);
  isSyncingRef.current = isSyncing;

  const processSyncQueue = useCallback(async () => {
    // This function should only run when online and not already syncing.
    if (!isOnline || isSyncingRef.current || syncQueue.length === 0) {
      return;
    }

    setIsSyncing(true);
    toast({ title: 'Syncing started...', description: `Processing ${syncQueue.length} offline changes.` });

    const queue = [...syncQueue];
    const failedOperations: SyncOperation[] = [];

    for (const op of queue) {
      try {
        let response;
        if (op.type === 'add') {
          response = await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(op.payload),
          });
        } else if (op.type === 'update') {
          response = await fetch(`/api/transactions/${op.payload.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(op.payload),
          });
        } else if (op.type === 'delete') {
          response = await fetch(`/api/transactions/${op.payload.id}`, {
            method: 'DELETE',
          });
        }
        if (!response || !response.ok) {
          throw new Error(`Failed to sync ${op.type} operation for ID ${op.payload.id}`);
        }
      } catch (error) {
        console.error('Sync error:', error);
        failedOperations.push(op);
      }
    }
    
    // After attempting to sync, fetch the single source of truth from the server
    try {
      const response = await fetch('/api/transactions');
      if (!response.ok) throw new Error('Failed to fetch from remote after sync');
      const remoteTransactions: Transaction[] = await response.json();

      // The server's state is now the ground truth.
      // We check if any failed operations are still relevant.
      const stillRelevantFailedOps = failedOperations.filter(op => {
         if (op.type === 'add' || op.type === 'update') {
            // If the transaction is on the server, the op is no longer needed.
            return !remoteTransactions.some(t => t.id === op.payload.id);
         }
         if (op.type === 'delete') {
            // If the transaction is NOT on the server, the deletion was successful.
            return remoteTransactions.some(t => t.id === op.payload.id);
         }
         return false;
      });

      setTransactions(remoteTransactions);
      setSyncQueue(stillRelevantFailedOps);

      if (stillRelevantFailedOps.length > 0) {
        toast({ title: 'Sync Partially Failed', description: `${stillRelevantFailedOps.length} changes could not be synced and were kept for retry.`, variant: 'destructive' });
      } else {
        toast({ title: 'Sync Complete!', description: 'All offline changes have been saved to the cloud.' });
      }

    } catch (error) {
      console.error("Critical error: Could not fetch from remote after sync.", error);
      toast({ title: 'Sync Error', description: `Could not verify sync status with the server. Retaining failed operations.`, variant: 'destructive'});
      setSyncQueue(failedOperations); // Keep failed ops if we can't verify
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, syncQueue, setSyncQueue, toast, setTransactions]);


  useEffect(() => {
    // Immediately set loading to false because we have local data to show.
    setIsLoading(false);
    
    // Set initial online status and set up listeners.
    const handleOnlineStatusChange = () => {
      setIsOnline(navigator.onLine);
    };

    if (typeof window !== 'undefined' && typeof navigator.onLine === 'boolean') {
      handleOnlineStatusChange();
      window.addEventListener('online', handleOnlineStatusChange);
      window.addEventListener('offline', handleOnlineStatusChange);
    }

    // Initial fetch from server if we are online.
    const initialFetch = async () => {
      if (navigator.onLine) {
        setIsLoading(true);
        try {
          const response = await fetch('/api/transactions');
          if (!response.ok) throw new Error('Failed to fetch initial data');
          const serverTransactions: Transaction[] = await response.json();
          // Server is the source of truth, but we must not overwrite unsynced local changes.
          // This simple overwrite is safe because sync runs right after.
          setTransactions(serverTransactions);
        } catch (error) {
          console.warn("Could not fetch from remote, using local data.", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    initialFetch();

    return () => {
      window.removeEventListener('online', handleOnlineStatusChange);
      window.removeEventListener('offline', handleOnlineStatusChange);
    };
  }, [setTransactions]);


  useEffect(() => {
    if (isOnline) {
      processSyncQueue();
    }
  }, [isOnline, processSyncQueue]);


  const handleAddTransaction = () => {
    setEditingTransaction(null);
    setIsTransactionFormOpen(true);
  }

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsTransactionFormOpen(true);
  }

  const handleTransactionFormClose = () => {
    setIsTransactionFormOpen(false);
    setEditingTransaction(null);
  }

  const handleTransactionDone = (values: any) => {
    const isEditing = !!editingTransaction;
    
    const transactionData: Transaction = {
      ...values,
      id: isEditing ? editingTransaction!.id : crypto.randomUUID(),
      date: values.date.toISOString(),
      accountName: values.accountId,
    };

    if (isEditing) {
      setTransactions(prev => prev.map(t => t.id === transactionData.id ? transactionData : t));
      setSyncQueue(prev => [...prev.filter(op => op.payload.id !== transactionData.id), { type: 'update', payload: transactionData }]);
    } else {
      setTransactions(prev => [transactionData, ...prev]);
      setSyncQueue(prev => [...prev, { type: 'add', payload: transactionData }]);
    }
    
    toast({
      title: `Transaction ${isEditing ? 'Updated' : 'Added'} Locally`,
      description: `Your transaction is saved locally and will sync when online.`,
    });
    
    handleTransactionFormClose();
    // Trigger sync if online
    if(isOnline) {
      processSyncQueue();
    }
  }

  const handleDeleteTransaction = (transactionId: string) => {
      setTransactions(prev => prev.filter(t => t.id !== transactionId));
      // Remove any 'add' or 'update' operations for this ID from the queue before adding a 'delete'
      setSyncQueue(prev => [...prev.filter(op => op.payload.id !== transactionId), { type: 'delete', payload: { id: transactionId } }]);
      toast({
        title: 'Transaction Deleted Locally',
        description: 'The transaction will be permanently deleted when online.',
      });
      // Trigger sync if online
      if(isOnline) {
        processSyncQueue();
      }
  }

  const { totalIncome, totalExpenses, balance } = useMemo(() => {
    const income = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      totalIncome: income,
      totalExpenses: expenses,
      balance: income - expenses,
    };
  }, [transactions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <>
    <div className="flex min-h-screen w-full flex-col">
      <Header
        accounts={accounts}
        setAccounts={setAccounts}
        onAddTransaction={handleAddTransaction}
      />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Alert variant={isOnline ? 'default' : 'destructive'}>
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                    <AlertTitle className="ml-2">{isOnline ? "You're online" : "You're offline"}</AlertTitle>
                </div>
                 {(syncQueue.length > 0 || isSyncing) && (
                    <Badge variant="secondary">
                      {isSyncing ? 'Syncing...' : `${syncQueue.length} changes waiting to sync`}
                    </Badge>
                )}
            </div>
            <AlertDescription>
             {isOnline ? (isSyncing ? "Saving changes to the cloud..." : "All changes are synced with the cloud.") : "Your changes are being saved locally and will sync when you're back online."}
            </AlertDescription>
        </Alert>

        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalIncome)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenses)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Balance</CardTitle>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(balance)}</div>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4 md:gap-8 lg:grid-cols-1">
          <div className="xl:col-span-2">
            {isLoading ? (
               <Card>
                  <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </CardContent>
                </Card>
            ) : (
              <TransactionList
                transactions={transactions}
                onEdit={handleEditTransaction}
                onDelete={handleDeleteTransaction}
              />
            )}
          </div>
        </div>
      </main>
    </div>
     <TransactionForm
        isOpen={isTransactionFormOpen}
        onClose={handleTransactionFormClose}
        accounts={accounts}
        onSubmit={handleTransactionDone}
        transactionToEdit={editingTransaction}
      />
    </>
  );
}
