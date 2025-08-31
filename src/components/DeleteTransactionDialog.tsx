import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { deleteTransaction } from '@/lib/actions';
import type { Transaction } from '@/lib/types';

interface DeleteTransactionDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  transaction: Transaction | null;
  onSuccess: () => void;
}

export function DeleteTransactionDialog({ isOpen, setIsOpen, transaction, onSuccess }: DeleteTransactionDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!transaction) return;

    setIsDeleting(true);
    try {
      await deleteTransaction(transaction.id);
      toast({
        title: 'Transaction Deleted',
        description: 'The transaction has been successfully deleted.',
      });
      onSuccess();
      setIsOpen(false);
    } catch (error) {
      toast({
        title: 'Error Deleting Transaction',
        description: 'Could not delete the transaction. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete this transaction from your records.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
             <Button onClick={handleDelete} disabled={isDeleting} variant="destructive">
                {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
