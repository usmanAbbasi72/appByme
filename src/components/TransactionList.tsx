import { useState } from 'react';
import type { Transaction } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CircleDollarSign, MinusCircle, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Badge } from './ui/badge';
import { format } from 'date-fns';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { DeleteTransactionDialog } from './DeleteTransactionDialog';

interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transactionId: string) => void;
}

export function TransactionList({ transactions, onEdit, onDelete }: TransactionListProps) {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(amount);
    };

    const handleDeleteClick = (transaction: Transaction) => {
        setSelectedTransaction(transaction);
        setIsDeleteDialogOpen(true);
    }
    
    const handleConfirmDelete = () => {
        if(selectedTransaction) {
            onDelete(selectedTransaction.id)
            setIsDeleteDialogOpen(false);
            setSelectedTransaction(null);
        }
    }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>A list of your most recent income and expenses.</CardDescription>
      </CardHeader>
      <CardContent>
        {transactions.length > 0 ? (
          <div className="space-y-4">
            {transactions.slice(0, 10).map((transaction) => (
              <div key={transaction.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  {transaction.type === 'income' ? (
                    <CircleDollarSign className="h-5 w-5 text-green-500" />
                  ) : (
                    <MinusCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <div className="grid gap-1 flex-1">
                  <p className="font-medium">{transaction.reason}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <p>{format(new Date(transaction.date), 'MMM d, yyyy')}</p>
                    {transaction.accountName && (
                        <>
                        <span>•</span>
                        <p>{transaction.accountName}</p>
                        </>
                    )}
                  </div>
                </div>
                <div className="text-right">
                    <p className={`font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </p>
                    <Badge variant="outline" className="mt-1">{transaction.category}</Badge>
                </div>
                 <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(transaction)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDeleteClick(transaction)} className="text-destructive focus:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <p>No transactions yet.</p>
            <p className="text-sm">Add a transaction to get started!</p>
          </div>
        )}
      </CardContent>
    </Card>
     <DeleteTransactionDialog
        isOpen={isDeleteDialogOpen}
        setIsOpen={setIsDeleteDialogOpen}
        onConfirmDelete={handleConfirmDelete}
      />
    </>
  );
}
