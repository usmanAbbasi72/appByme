
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Account, Debt } from '@/lib/types';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, BookUser, Wallet } from 'lucide-react';
import { DebtList } from '@/components/DebtList';
import { DebtForm } from '@/components/DebtForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type SyncOperation =
  | { type: 'add'; payload: Debt }
  | { type: 'update'; payload: Debt }
  | { type: 'delete'; payload: { id: string } };

export default function DebtsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{username: string} | null>(null);

  const [debts, setDebts] = useLocalStorage<Debt[]>('debts', []);
  const [accounts, setAccounts] = useLocalStorage<Account[]>('accounts', []);
  const [syncQueue, setSyncQueue] = useLocalStorage<SyncOperation[]>('debtsSyncQueue', []);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const [isDebtFormOpen, setIsDebtFormOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const { toast } = useToast();

  const isSyncingRef = useRef(isSyncing);
  isSyncingRef.current = isSyncing;
  
  const handleLogout = () => {
    localStorage.removeItem('user');
    setDebts([]);
    setAccounts([]);
    setSyncQueue([]);
    router.push('/login');
  };

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
          response = await fetch('/api/debts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(op.payload),
          });
        } else if (op.type === 'update') {
          response = await fetch(`/api/debts/${op.payload.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(op.payload),
          });
        } else if (op.type === 'delete') {
          response = await fetch(`/api/debts/${op.payload.id}`, {
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
    
    try {
      const res = await fetch('/api/debts');
      if (!res.ok) throw new Error('Failed to re-fetch debts post-sync');
      const serverDebts: Debt[] = await res.json();
      setDebts(serverDebts);
      
      if (successfullySyncedOps.length > 0) {
          const remainingOps = syncQueue.length - successfullySyncedOps.length;
          if (remainingOps > 0) {
            toast({ title: 'Sync Partially Complete', description: `${successfullySyncedOps.length} changes synced. ${remainingOps} remaining.` });
          } else {
            toast({ title: 'Sync Complete!', description: 'All debt records are saved to the cloud.' });
          }
      }
    } catch (error) {
      console.error("Could not fetch from remote after sync.", error);
      toast({ title: 'Sync Error', description: `Could not verify data with the server. Please check your connection.`, variant: 'destructive'});
    } finally {
      setIsSyncing(false);
    }
  }, [syncQueue, setSyncQueue, toast, setDebts]);

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
        await processSyncQueue();
        try {
          const res = await fetch('/api/debts');
          if (!res.ok) throw new Error('Server fetch failed');
          const serverDebts: Debt[] = await res.json();
          setDebts(serverDebts);
        } catch (e) {
          console.warn('Could not fetch from server on initial load, using local data.', e);
        }
      }
      setIsLoading(false);
    };

    if(user) {
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

  const handleAddDebt = () => {
    setEditingDebt(null);
    setIsDebtFormOpen(true);
  }

  const handleEditDebt = (debt: Debt) => {
    setEditingDebt(debt);
    setIsDebtFormOpen(true);
  }

  const handleDebtFormClose = () => {
    setIsDebtFormOpen(false);
    setEditingDebt(null);
  }

  const handleDebtFormDone = (values: any) => {
    const isEditing = !!editingDebt;
    
    const debtData: Debt = {
      ...values,
      id: isEditing ? editingDebt!.id : crypto.randomUUID(),
      date: new Date().toISOString(),
    };

    if (isEditing) {
      setDebts(prev => prev.map(d => d.id === debtData.id ? debtData : d));
    } else {
      setDebts(prev => [debtData, ...prev]);
    }
    
    setSyncQueue(prev => {
        const filtered = prev.filter(op => !('payload' in op && op.payload && 'id' in op.payload && op.payload.id === debtData.id));
        const operationType = isEditing ? 'update' : 'add';
        return [...filtered, { type: operationType, payload: debtData }];
    });
    
    toast({
      title: `Record ${isEditing ? 'Updated' : 'Added'} Locally`,
      description: `The record is saved and will sync when online.`,
    });
    
    handleDebtFormClose();
    if (isOnline) {
        processSyncQueue();
    }
  }

  const handleDeleteDebt = (debtId: string) => {
      setDebts(prevDebts => prevDebts.filter(d => d.id !== debtId));
      
      setSyncQueue(prevQueue => {
        const queueWithoutAddOrUpdate = prevQueue.filter(op => 
            !(op.type !== 'delete' && op.payload.id === debtId)
        );
        const alreadyHasDelete = queueWithoutAddOrUpdate.some(op => op.type === 'delete' && op.payload.id === debtId);
        if(alreadyHasDelete) return queueWithoutAddOrUpdate;

        return [...queueWithoutAddOrUpdate, { type: 'delete', payload: { id: debtId } }];
      });

      toast({
        title: 'Record Deleted Locally',
        description: 'This change will sync when you are next online.',
      });

      if (isOnline) {
          processSyncQueue();
      }
  }

  const { debtors, personalDebts, totalOwedToUser, totalOwedByUser } = useMemo(() => {
    const debtors = debts.filter(d => d.type === 'debtor');
    const personalDebts = debts.filter(d => d.type === 'debt');
    const totalOwedToUser = debtors.reduce((sum, d) => sum + d.amount, 0);
    const totalOwedByUser = personalDebts.reduce((sum, d) => sum + d.amount, 0);

    return { debtors, personalDebts, totalOwedToUser, totalOwedByUser };
  }, [debts]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
    }).format(amount);
  };
  
  if (isLoading && !user) {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-4">
        <Wallet className="h-16 w-16 text-primary mb-4 animate-pulse" />
        <h1 className="text-2xl font-semibold mb-2">Loading...</h1>
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
        onAddTransaction={() => router.push('/')}
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

        <div className="grid gap-4 sm:grid-cols-2">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Money Owed to You (Debtors)</CardTitle>
                <BookUser className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(totalOwedToUser)}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Money You Owe (Debts)</CardTitle>
                <BookUser className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(totalOwedByUser)}</div>
                </CardContent>
            </Card>
        </div>

        <DebtList
            debtors={debtors}
            personalDebts={personalDebts}
            onEdit={handleEditDebt}
            onDelete={handleDeleteDebt}
            onAdd={handleAddDebt}
         />
      
      </main>
    </div>
     <DebtForm
        isOpen={isDebtFormOpen}
        onClose={handleDebtFormClose}
        onSubmit={handleDebtFormDone}
        debtToEdit={editingDebt}
      />
    </>
  );
}

    