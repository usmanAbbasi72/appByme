import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { TRANSACTION_CATEGORIES } from '@/lib/constants';
import type { Account, Transaction } from '@/lib/types';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number().positive({ message: 'Please enter a positive amount.' }),
  date: z.date(),
  reason: z.string().min(2, { message: 'Reason must be at least 2 characters.' }),
  category: z.string().min(1, { message: 'Please select a category.' }),
  accountId: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  onSubmit: (values: TransactionFormValues) => void;
  transactionToEdit?: Transaction | null;
}

export function TransactionForm({ isOpen, onClose, accounts, onSubmit, transactionToEdit }: TransactionFormProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const isEditing = !!transactionToEdit;

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
  });
  
  useEffect(() => {
    if (isOpen) {
      if (isEditing && transactionToEdit) {
        form.reset({
          ...transactionToEdit,
          date: new Date(transactionToEdit.date),
          amount: Math.abs(transactionToEdit.amount),
          accountId: transactionToEdit.accountName,
        });
      } else {
        form.reset({
          type: 'expense',
          amount: 0,
          date: new Date(),
          reason: '',
          category: '',
          accountId: '',
        });
      }
    }
  }, [transactionToEdit, isEditing, form, isOpen]);


  const type = form.watch('type');

  const handleFormSubmit = async (values: TransactionFormValues) => {
    setIsLoading(true);
    await onSubmit(values);
    setIsLoading(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit' : 'Add'} Transaction</SheetTitle>
          <SheetDescription>
            {isEditing ? 'Update the details of your transaction.' : 'Record a new income or expense.'}
             Click save when you&apos;re done.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 py-6">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="income" />
                        </FormControl>
                        <FormLabel className="font-normal">Income</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="expense" />
                        </FormControl>
                        <FormLabel className="font-normal">Expense</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Groceries, Salary" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TRANSACTION_CATEGORIES[type].map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {accounts.length > 0 && (
                 <FormField
                 control={form.control}
                 name="accountId"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Account</FormLabel>
                     <Select onValueChange={field.onChange} value={field.value}>
                       <FormControl>
                         <SelectTrigger>
                           <SelectValue placeholder="Select an account" />
                         </SelectTrigger>
                       </FormControl>
                       <SelectContent>
                         {accounts.map((account) => (
                           <SelectItem key={account.id} value={account.name}>
                             {account.name}
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                     <FormMessage />
                   </FormItem>
                 )}
               />
            )}

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <SheetFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Transaction'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
