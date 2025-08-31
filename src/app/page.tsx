
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
  
  // isLoading is for background server fetches, not initial render.
  const [isLoading, setIsLoading] = useState(false); 
  const [isOnline, setIsOnline] = useState(true); // Assume online by default
  const [isSyncing, setIsSyncing] = useState(false);

  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const { toast } = useToast();

  const isSyncingRef = useRef(isSyncing);
  isSyncingRef.current = isSyncing;

  const processSyncQueue = useCallback(async () => {
    // This function should only run when online and not already syncing.
    if (!navigator.onLine || isSyncingRef.current || syncQueue.length === 0) {
      return;
    }

    setIsSyncing(true);
    toast({ title: 'Syncing started...', description: `Processing ${syncQueue.length} offline changes.` });

    const queue = [...syncQueue];
    let successfullySyncedOps: SyncOperation[] = [];

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
        if (response && response.ok) {
           successfullySyncedOps.push(op);
        } else {
           throw new Error(`Failed to sync ${op.type} operation for ID ${'id' in op.payload ? op.payload.id : 'N/A'}`);
        }
      } catch (error) {
        console.error('Sync error:', error);
        // If an operation fails, we stop and keep it in the queue for the next attempt.
        // We break here to avoid potential data consistency issues from out-of-order operations.
        break; 
      }
    }
    
    // Remove the successfully synced operations from the front of the queue.
    const remainingOps = syncQueue.slice(successfullySyncedOps.length);
    setSyncQueue(remainingOps);

    // After a sync attempt, always fetch the latest state from the server
    // to ensure local data is consistent with the source of truth.
    try {
      setIsLoading(true);
      const res = await fetch('/api/transactions');
      if (!res.ok) throw new Error('Failed to re-fetch transactions post-sync');
      const serverTransactions: Transaction[] = await res.json();
      setTransactions(serverTransactions);
      
      if (successfullySyncedOps.length > 0) {
          if (remainingOps.length > 0) {
            toast({ title: 'Sync Partially Complete', description: `${successfullySyncedOps.length} changes synced. ${remainingOps.length} remaining.` });
          } else {
            toast({ title: 'Sync Complete!', description: 'All changes have been saved to the cloud.' });
          }
      }
    } catch (error) {
      console.error("Could not fetch from remote after sync.", error);
      toast({ title: 'Sync Error', description: `Could not verify data with the server. Please try again later.`, variant: 'destructive'});
    } finally {
      setIsSyncing(false);
      setIsLoading(false);
    }
  }, [syncQueue, setSyncQueue, toast, setTransactions]);

  useEffect(() => {
    // This function sets the online status and is called on mount and on network change events.
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    // Check status on initial mount.
    updateOnlineStatus();

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // Fetch initial data from server if online.
    const initialFetch = async () => {
      if (navigator.onLine) {
        setIsLoading(true);
        try {
          const response = await fetch('/api/transactions');
          if (!response.ok) throw new Error('Failed to fetch initial data');
          const serverTransactions: Transaction[] = await response.json();
          // Overwrite local data with server data, as server is source of truth.
          // This ensures consistency on the first load when online.
          setTransactions(serverTransactions);
        } catch (error) {
          console.warn("Could not fetch from remote on initial load, using local data.", error);
          // If the fetch fails, we simply rely on the data already loaded from localStorage by useLocalStorage.
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    initialFetch();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  // We only want this to run once on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // This effect is dedicated to triggering the sync process whenever the app comes online.
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

    // Optimistically update local state first
    if (isEditing) {
      setTransactions(prev => prev.map(t => t.id === transactionData.id ? transactionData : t));
    } else {
      setTransactions(prev => [transactionData, ...prev]);
    }
    
    // Add to sync queue
    setSyncQueue(prev => {
        // To ensure data integrity, especially for edits, we remove any previous operations for this ID.
        const filtered = prev.filter(op => !('id' in op.payload) || op.payload.id !== transactionData.id);
        const operationType = isEditing ? 'update' : 'add';
        return [...filtered, { type: operationType, payload: transactionData }];
    });
    
    toast({
      title: `Transaction ${isEditing ? 'Updated' : 'Added'} Locally`,
      description: `Your transaction is saved and will sync when online.`,
    });
    
    handleTransactionFormClose();
    // Immediately try to sync if online
    if (isOnline) {
        processSyncQueue();
    }
  }

  const handleDeleteTransaction = (transactionId: string) => {
      // Optimistically update local state first
      setTransactions(prev => prev.filter(t => t.id !== transactionId));
      
      // Add to sync queue
      setSyncQueue(prev => {
        // Important: Remove any other operations for this ID before adding a 'delete'
        // This prevents syncing an add/update for an item that should be deleted.
        const filtered = prev.filter(op => !('id' in op.payload) || op.payload.id !== transactionId);
        return [...filtered, { type: 'delete', payload: { id: transactionId } }];
      });

      toast({
        title: 'Transaction Deleted Locally',
        description: 'The transaction will be permanently deleted when you are next online.',
      });

      // Immediately try to sync if online
      if (isOnline) {
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
  
  // By default, the app now shows the content immediately using local data.
  // The "offline" message is only shown if the user is offline AND there are no transactions at all.
  if (!isOnline && transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center">
        <DollarSign className="h-16 w-16 text-primary mb-4" />
        <h1 className="text-2xl font-semibold mb-2">You're Offline</h1>
        <p className="text-muted-foreground">Connect to the internet to get started.</p>
      </div>
    );
  }

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
                      {isSyncing ? 'Syncing...' : `${syncQueue.length} changes pending`}
                    </Badge>
                )}
            </div>
            <AlertDescription>
             {isOnline ? (isSyncing ? "Saving changes to the cloud..." : (syncQueue.length === 0 ? "All changes are saved to the cloud." : "Ready to sync pending changes.")) : "Your changes are saved locally and will sync when you're back online."}
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
            {isLoading && transactions.length === 0 ? (
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