import React from 'react';
import { IndianRupee, Settings, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ManageAccountsDialog } from '@/components/ManageAccountsDialog';
import type { Account } from '@/lib/types';

interface HeaderProps {
  accounts: Account[];
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>;
  onAddTransaction: () => void;
}

export function Header({ accounts, setAccounts, onAddTransaction }: HeaderProps) {
  const [isAccountsDialogOpen, setAccountsDialogOpen] = React.useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
        <div className="flex items-center gap-2 font-semibold">
          <IndianRupee className="h-6 w-6 text-primary" />
          <span className="text-lg">Osman's Personal Assistant</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setAccountsDialogOpen(true)}>
            <Settings className="h-4 w-4" />
            <span className="sr-only">Manage Accounts</span>
          </Button>
          <Button size="sm" className="gap-1 rounded-full" onClick={onAddTransaction}>
            <PlusCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Add Transaction</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </header>
      <ManageAccountsDialog
        isOpen={isAccountsDialogOpen}
        setIsOpen={setAccountsDialogOpen}
        accounts={accounts}
        setAccounts={setAccounts}
      />
    </>
  );
}
