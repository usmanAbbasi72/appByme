'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Account, Transaction } from '@/lib/types';
import { getTransactions, addTransaction, updateTransaction, deleteTransaction } from '@/lib/actions';
import { useLocalStorage } from '@/hooks/use-local-storage';

import { Header } from '@/components/Header';
import { TransactionList } from '@/components/TransactionList';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TransactionForm } from '@/components/TransactionForm';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useLocalStorage<Account[]>('accounts', []);
  const [loading, setLoading] = useState(true);
  const [showNotification, setShowNotification] = useState(false);
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const { toast } = useToast();

  const refreshTransactions = useCallback(() => {
    setLoading(true);
    const fetchedTransactions = getTransactions();
    setTransactions(fetchedTransactions);
    setLoading(false);
  }, []);


  useEffect(() => {
    refreshTransactions();
    const lastDismissed = localStorage.getItem('notificationDismissed');
    const today = new Date().toDateString();
    if (lastDismissed !== today) {
      setShowNotification(true);
    }
  }, [refreshTransactions]);

  const handleDismissNotification = () => {
    setShowNotification(false);
    const today = new Date().toDateString();
    localStorage.setItem('notificationDismissed', today);
  };

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
  
  const handleTransactionDone = async (values: any) => {
    const isEditing = !!editingTransaction;
    try {
        if (isEditing) {
            await updateTransaction({ ...values, id: editingTransaction.id, accountName: values.accountId });
            toast({
              title: 'Transaction Updated',
              description: 'Your transaction has been successfully updated.',
            });
        } else {
            await addTransaction({...values, accountName: values.accountId});
            toast({
              title: 'Transaction Added',
              description: 'Your transaction has been successfully recorded.',
            });
        }
        refreshTransactions();
        handleTransactionFormClose();
    } catch (error) {
         toast({
            title: 'Error',
            description: `Failed to ${isEditing ? 'update' : 'add'} transaction. Please try again.`,
            variant: 'destructive',
          });
    }
  }

  const handleDeleteTransaction = async (transactionId: string) => {
    try {
      await deleteTransaction(transactionId);
      toast({
        title: 'Transaction Deleted',
        description: 'The transaction has been successfully deleted.',
      });
      refreshTransactions();
    } catch (error) {
       toast({
        title: 'Error Deleting Transaction',
        description: 'Could not delete the transaction. Please try again.',
        variant: 'destructive',
      });
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
        {showNotification && (
          <Alert>
            <Terminal className="h-4 w-4" />
            <AlertTitle>Hey there!</AlertTitle>
            <AlertDescription>
              Don&apos;t forget to log your income and expenses for today to keep your finances on track.
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismissNotification}
                className="ml-4"
              >
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}
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
            {loading ? (
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
