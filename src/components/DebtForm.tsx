
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Debt } from '@/lib/types';

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
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';

const debtSchema = z.object({
  type: z.enum(['debtor', 'debt']),
  amount: z.coerce.number().positive({ message: 'Please enter a positive amount.' }),
  personName: z.string().min(2, { message: 'Person name must be at least 2 characters.' }),
  reason: z.string().min(2, { message: 'Reason must be at least 2 characters.' }),
});

type DebtFormValues = z.infer<typeof debtSchema>;

interface DebtFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: DebtFormValues) => void;
  debtToEdit?: Debt | null;
}

export function DebtForm({ isOpen, onClose, onSubmit, debtToEdit }: DebtFormProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const isEditing = !!debtToEdit;

  const form = useForm<DebtFormValues>({
    resolver: zodResolver(debtSchema),
  });
  
  useEffect(() => {
    if (isOpen) {
      if (isEditing && debtToEdit) {
        form.reset({
          ...debtToEdit,
          amount: Math.abs(debtToEdit.amount),
        });
      } else {
        form.reset({
          type: 'debtor',
          amount: undefined,
          personName: '',
          reason: '',
        });
      }
    }
  }, [debtToEdit, isEditing, form, isOpen]);


  const handleFormSubmit = async (values: DebtFormValues) => {
    setIsLoading(true);
    await onSubmit(values);
    setIsLoading(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit' : 'Add'} Record</SheetTitle>
          <SheetDescription>
            {isEditing ? 'Update the details of this record.' : 'Record a new debt or debtor.'}
             Click save when you&apos;re done.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 pr-6 -mr-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 py-6">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Record Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid grid-cols-2 gap-4"
                    >
                      <FormItem>
                         <RadioGroupItem value="debtor" id="debtor" className="sr-only" />
                         <FormLabel htmlFor="debtor" className={cn(
                           "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground",
                            field.value === 'debtor' && "border-primary"
                         )}>
                          Owed to Me
                        </FormLabel>
                      </FormItem>
                     <FormItem>
                         <RadioGroupItem value="debt" id="debt" className="sr-only" />
                         <FormLabel htmlFor="debt" className={cn(
                           "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground",
                            field.value === 'debt' && "border-primary"
                         )}>
                          I Owe
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="personName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Person&apos;s Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., John Doe" {...field} />
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
                    <Textarea placeholder="e.g., Lunch, Loan" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        </ScrollArea>
        <SheetFooter className="pt-4">
          <Button onClick={form.handleSubmit(handleFormSubmit)} disabled={isLoading} className="w-full">
            {isLoading ? 'Saving...' : 'Save Record'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
