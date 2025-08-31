import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Account } from '@/lib/types';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Badge } from './ui/badge';
import { X } from 'lucide-react';

const accountSchema = z.object({
  name: z.string().min(2, { message: 'Account name must be at least 2 characters.' }),
});

interface ManageAccountsDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  accounts: Account[];
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>;
}

export function ManageAccountsDialog({ isOpen, setIsOpen, accounts, setAccounts }: ManageAccountsDialogProps) {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof accountSchema>>({
    resolver: zodResolver(accountSchema),
    defaultValues: { name: '' },
  });

  const onSubmit = (values: z.infer<typeof accountSchema>) => {
    if (accounts.some(acc => acc.name.toLowerCase() === values.name.toLowerCase())) {
        toast({
            title: 'Account exists',
            description: 'An account with this name already exists.',
            variant: 'destructive',
        });
        return;
    }
    const newAccount: Account = { id: crypto.randomUUID(), name: values.name };
    setAccounts([...accounts, newAccount]);
    toast({
      title: 'Account Added',
      description: `"${values.name}" has been added to your accounts.`,
    });
    form.reset();
  };
  
  const deleteAccount = (id: string) => {
    setAccounts(accounts.filter(acc => acc.id !== id));
    toast({
        title: 'Account Removed',
        description: 'The account has been removed.',
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Accounts</DialogTitle>
          <DialogDescription>
            Add or remove your financial accounts like banks or e-wallets.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Your Accounts</h3>
          <div className="flex flex-wrap gap-2 mb-6">
            {accounts.length > 0 ? (
              accounts.map((account) => (
                <Badge key={account.id} variant="secondary" className="pl-3 pr-1 py-1 text-sm">
                  {account.name}
                  <button onClick={() => deleteAccount(account.id)} className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No accounts added yet.</p>
            )}
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Add New Account</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Meezan Bank, Easy Paisa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit">Add Account</Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
