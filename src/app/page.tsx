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

  const [isLoading, setIsLoading] = useState(true); // Manages loading state for remote fetches
  const [isOnline, setIsOnline] = useState(false); // Assume offline until verified
  const [isSyncing, setIsSyncing] = useState(false);

  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const { toast } = useToast();

  const isSyncingRef = useRef(isSyncing);
  isSyncingRef.current = isSyncing;

  const processSyncQueue = useCallback(async () => {
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
          throw new Error(`Failed to sync ${op.type} operation for ID ${'id' in op.payload ? op.payload.id : 'N/A'}`);
        }
      } catch (error) {
        console.error('Sync error:', error);
        failedOperations.push(op);
      }
    }
    
    // After attempting to sync, fetch the single source of truth from the server
    try {
      setIsLoading(true);
      const response = await fetch('/api/transactions');
      if (!response.ok) throw new Error('Failed to fetch from remote after sync');
      const remoteTransactions: Transaction[] = await response.json();

      const stillRelevantFailedOps = failedOperations.filter(op => {
         if (op.type === 'add' || op.type === 'update') {
            return !remoteTransactions.some(t => t.id === op.payload.id);
         }
         if (op.type === 'delete') {
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
      setSyncQueue(failedOperations);
    } finally {
      setIsSyncing(false);
      setIsLoading(false);
    }
  }, [isOnline, syncQueue, setSyncQueue, toast, setTransactions]);

  useEffect(() => {
    // Data from localStorage is already loaded, so we are never in a true "initial loading" state.
    setIsLoading(false);

    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // Set initial status
    updateOnlineStatus();

    // Fetch from server on initial load IF online
    const initialFetch = async () => {
      if (navigator.onLine) {
        setIsLoading(true); // Indicate background loading
        try {
          const response = await fetch('/api/transactions');
          if (!response.ok) throw new Error('Failed to fetch initial data');
          const serverTransactions: Transaction[] = await response.json();
          // This simple overwrite is safe because processSyncQueue runs right after,
          // which will re-evaluate based on the server state.
          setTransactions(serverTransactions); 
        } catch (error) {
          console.warn("Could not fetch from remote, using local data.", error);
        } finally {
          setIsLoading(false); // Done with background loading
        }
      }
    };

    initialFetch();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, [setTransactions]);

  useEffect(() => {
    // This effect now correctly triggers a sync only when online status changes to true,
    // or on initial load if already online.
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

    // Optimistically update local state first
    if (isEditing) {
      setTransactions(prev => prev.map(t => t.id === transactionData.id ? transactionData : t));
    } else {
      setTransactions(prev => [transactionData, ...prev]);
    }
    
    // Add to sync queue
    setSyncQueue(prev => {
        // Remove any previous operations for this ID before adding the new one.
        const filtered = prev.filter(op => !('id' in op.payload) || op.payload.id !== transactionData.id);
        const operationType = isEditing ? 'update' : 'add';
        return [...filtered, { type: operationType, payload: transactionData }];
    });
    
    toast({
      title: `Transaction ${isEditing ? 'Updated' : 'Added'} Locally`,
      description: `Your transaction is saved locally and will sync when online.`,
    });
    
    handleTransactionFormClose();
    
    // Trigger a sync immediately if online
    if(isOnline) {
      processSyncQueue();
    }
  }

  const handleDeleteTransaction = (transactionId: string) => {
      // Optimistically update local state first
      setTransactions(prev => prev.filter(t => t.id !== transactionId));
      
      // Add to sync queue
      setSyncQueue(prev => {
        // Remove any other operations for this ID from the queue before adding a 'delete'
        const filtered = prev.filter(op => !('id' in op.payload) || op.payload.id !== transactionId);
        return [...filtered, { type: 'delete', payload: { id: transactionId } }];
      });

      toast({
        title: 'Transaction Deleted Locally',
        description: 'The transaction will be permanently deleted when online.',
      });
      
      // Trigger a sync immediately if online
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
            {isLoading && isOnline ? (
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
