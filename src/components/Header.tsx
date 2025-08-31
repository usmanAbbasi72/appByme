import React from 'react';
import { DollarSign, Settings, PlusCircle } from 'lucide-react';
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
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
        <div className="flex items-center gap-2 font-semibold">
          <DollarSign className="h-6 w-6 text-primary" />
          <span className="text-lg">Osman's Personal App</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setAccountsDialogOpen(true)}>
            <Settings className="h-4 w-4" />
            <span className="sr-only">Manage Accounts</span>
          </Button>
          <Button size="sm" className="gap-1" onClick={onAddTransaction}>
            <PlusCircle className="h-4 w-4" />
            Add Transaction
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
