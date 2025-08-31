
import React from 'react';
import { IndianRupee, Settings, PlusCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ManageAccountsDialog } from '@/components/ManageAccountsDialog';
import type { Account } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';


interface HeaderProps {
  username: string;
  onLogout: () => void;
  accounts: Account[];
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>;
  onAddTransaction: () => void;
}

export function Header({ username, onLogout, accounts, setAccounts, onAddTransaction }: HeaderProps) {
  const [isAccountsDialogOpen, setAccountsDialogOpen] = React.useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
        <div className="flex items-center gap-2 font-semibold">
          <IndianRupee className="h-6 w-6 text-primary" />
          <span className="text-lg">Osman's Personal Assistant</span>
        </div>
        <div className="ml-auto flex items-center gap-4">
           <Button size="sm" className="gap-1" onClick={onAddTransaction}>
            <PlusCircle className="h-4 w-4" />
            <span>Add Transaction</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <Avatar>
                  <AvatarFallback>{username.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{username}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setAccountsDialogOpen(true)}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Manage Accounts</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

    