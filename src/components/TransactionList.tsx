import type { Transaction } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CircleDollarSign, MinusCircle } from 'lucide-react';
import { Badge } from './ui/badge';
import { format } from 'date-fns';

interface TransactionListProps {
  transactions: Transaction[];
}

export function TransactionList({ transactions }: TransactionListProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(amount);
      };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>A list of your most recent income and expenses.</CardDescription>
      </CardHeader>
      <CardContent>
        {transactions.length > 0 ? (
          <div className="space-y-4">
            {transactions.slice(0, 10).map((transaction, index) => (
              <div key={index} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50">
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
  );
}
