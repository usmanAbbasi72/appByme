
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Account, Transaction } from '@/lib/types';
import { useLocalStorage } from '@/hooks/use-local-storage';

import { Header } from '@/components/Header';
import { TransactionList } from '@/components/TransactionList';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Wifi, WifiOff, IndianRupee, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TransactionForm } from '@/components/TransactionForm';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';


type SyncOperation =
  | { type: 'add'; payload: Transaction }
  | { type: 'update'; payload: Transaction }
  | { type: 'delete'; payload: { id: string } };

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<{username: string} | null>(null);

  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('transactions', []);
  const [accounts, setAccounts] = useLocalStorage<Account[]>('accounts', []);
  const [syncQueue, setSyncQueue] = useLocalStorage<SyncOperation[]>('syncQueue', []);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const { toast } = useToast();

  const isSyncingRef = useRef(isSyncing);
  isSyncingRef.current = isSyncing;

  useEffect(() => {
    const loggedInUser = localStorage.getItem('user');
    if (!loggedInUser) {
      router.push('/login');
    } else {
      setUser(JSON.parse(loggedInUser));
    }
  }, [router]);


  const processSyncQueue = useCallback(async () => {
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
        break; 
      }
    }
    
    if (successfullySyncedOps.length > 0) {
      const newSyncQueue = syncQueue.filter(op => !successfullySyncedOps.some(syncedOp => JSON.stringify(syncedOp) === JSON.stringify(op)));
      setSyncQueue(newSyncQueue);
    }
    
    // Always fetch latest state from server after sync attempt
    try {
      const res = await fetch('/api/transactions');
      if (!res.ok) throw new Error('Failed to re-fetch transactions post-sync');
      const serverTransactions: Transaction[] = await res.json();
      setTransactions(serverTransactions);
      
       if (successfullySyncedOps.length > 0) {
          const remainingOps = syncQueue.length - successfullySyncedOps.length;
          if (remainingOps > 0) {
            toast({ title: 'Sync Partially Complete', description: `${successfullySyncedOps.length} changes synced. ${remainingOps} remaining.` });
          } else {
            toast({ title: 'Sync Complete!', description: 'All changes have been saved to the cloud.' });
          }
      }
    } catch (error) {
      console.error("Could not fetch from remote after sync.", error);
      toast({ title: 'Sync Error', description: `Could not verify data with the server. Please check your connection.`, variant: 'destructive'});
    } finally {
      setIsSyncing(false);
    }
  }, [syncQueue, setSyncQueue, toast, setTransactions]);

  useEffect(() => {
    const updateOnlineStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      if (online) {
        processSyncQueue();
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    const initialLoad = async () => {
      setIsOnline(navigator.onLine);
      if (navigator.onLine) {
        await processSyncQueue(); // Process any pending changes first
        try {
          const res = await fetch('/api/transactions');
          if (!res.ok) throw new Error('Server fetch failed');
          const serverTransactions: Transaction[] = await res.json();
          setTransactions(serverTransactions);
        } catch (e) {
          console.warn('Could not fetch from server on initial load, using local data.', e);
          toast({ title: 'Offline', description: 'Could not connect to the server. Using local data.' });
        }
      }
      setIsLoading(false);
    };

    if (user) {
      initialLoad();
    } else {
        setIsLoading(false);
    }

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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
    } else {
      setTransactions(prev => [transactionData, ...prev]);
    }
    
    setSyncQueue(prev => {
        const filtered = prev.filter(op => !('payload' in op && op.payload && 'id' in op.payload && op.payload.id === transactionData.id));
        const operationType = isEditing ? 'update' : 'add';
        return [...filtered, { type: operationType, payload: transactionData }];
    });
    
    toast({
      title: `Transaction ${isEditing ? 'Updated' : 'Added'} Locally`,
      description: `Your transaction is saved and will sync when online.`,
    });
    
    handleTransactionFormClose();
    if (isOnline) {
        processSyncQueue();
    }
  }

  const handleDeleteTransaction = (transactionId: string) => {
      setTransactions(prev => prev.filter(t => t.id !== transactionId));
      
      setSyncQueue(prev => {
        const filteredForDelete = prev.filter(op => !('payload' in op && op.payload && 'id' in op.payload && op.payload.id === transactionId));
        return [...filteredForDelete, { type: 'delete', payload: { id: transactionId } }];
      });

      toast({
        title: 'Transaction Deleted Locally',
        description: 'This change will sync when you are next online.',
        variant: 'destructive',
      });

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
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
    }).format(amount);
  };
  
  const handleLogout = () => {
    localStorage.removeItem('user');
    setTransactions([]);
    setAccounts([]);
    setSyncQueue([]);
    router.push('/login');
  };
  
  if (isLoading) {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-4">
        <Wallet className="h-16 w-16 text-primary mb-4 animate-pulse" />
        <h1 className="text-2xl font-semibold mb-2">Loading your finances...</h1>
        <p className="text-muted-foreground">Please wait a moment.</p>
      </div>
    );
  }

  if (!isOnline && transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-4">
        <WifiOff className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-semibold mb-2">You're Offline</h1>
        <p className="text-muted-foreground">Connect to the internet to get started and sync your data.</p>
      </div>
    );
  }

  return (
    <>
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <Header
        username={user?.username || ''}
        onLogout={handleLogout}
        accounts={accounts}
        setAccounts={setAccounts}
        onAddTransaction={handleAddTransaction}
      />
      <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6 md:gap-8 md:p-8">
        <Alert variant={isOnline ? 'default' : 'destructive'} className="shadow-sm">
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                    <AlertTitle className="ml-2">{isOnline ? "You're Online" : "You're Offline"}</AlertTitle>
                </div>
                 {(syncQueue.length > 0 || isSyncing) && (
                    <Badge variant="secondary">
                      {isSyncing ? 'Syncing...' : `${syncQueue.length} pending`}
                    </Badge>
                )}
            </div>
            <AlertDescription>
             {isOnline ? (isSyncing ? "Saving changes to the cloud..." : (syncQueue.length === 0 ? "All changes are saved and synced." : "Ready to sync pending changes.")) : "Changes are saved locally and will sync when you're back online."}
            </AlertDescription>
        </Alert>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
            </CardContent>
          </Card>
          <Card className="sm:col-span-2 lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(balance)}</div>
            </CardContent>
          </Card>
        </div>
        
        <TransactionList
          transactions={transactions}
          onEdit={handleEditTransaction}
          onDelete={handleDeleteTransaction}
        />
      
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

    