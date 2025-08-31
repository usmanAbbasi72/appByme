
import { useState } from 'react';
import type { Debt } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MoreVertical, Pencil, Trash2, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { DeleteTransactionDialog } from './DeleteTransactionDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface DebtListProps {
  debtors: Debt[];
  personalDebts: Debt[];
  onEdit: (debt: Debt) => void;
  onDelete: (debtId: string) => void;
  onAdd: () => void;
}

export function DebtList({ debtors, personalDebts, onEdit, onDelete, onAdd }: DebtListProps) {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-PK', {
          style: 'currency',
          currency: 'PKR',
        }).format(amount);
    };

    const handleDeleteClick = (debt: Debt) => {
        setSelectedDebt(debt);
        setIsDeleteDialogOpen(true);
    }
    
    const handleConfirmDelete = () => {
        if(selectedDebt) {
            onDelete(selectedDebt.id)
            setIsDeleteDialogOpen(false);
            setSelectedDebt(null);
        }
    }

    const renderDebtList = (debts: Debt[], type: 'debtor' | 'debt') => (
         <div className="flow-root">
            <ul className="-my-4 divide-y divide-border">
            {debts.map((debt) => (
              <li key={debt.id} className="flex items-center gap-4 py-4">
                <div className="grid gap-0.5 flex-1">
                  <p className="font-medium truncate">{debt.personName}</p>
                  <p className="text-sm text-muted-foreground">{debt.reason}</p>
                   <p className="text-xs text-muted-foreground pt-1">
                    {format(new Date(debt.date), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="text-right">
                    <p className={`font-semibold ${type === 'debtor' ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(debt.amount)}
                    </p>
                </div>
                 <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0 flex-shrink-0">
                      <span className="sr-only">Open menu</span>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(debt)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDeleteClick(debt)} className="text-destructive focus:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            ))}
            </ul>
          </div>
    )


  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Debt & Debtor Records</CardTitle>
            <CardDescription>Manage money you owe and money owed to you.</CardDescription>
        </div>
        <Button size="sm" onClick={onAdd}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Record
        </Button>
      </CardHeader>
      <CardContent>
         <Tabs defaultValue="debtors">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="debtors">Owed to You ({debtors.length})</TabsTrigger>
                <TabsTrigger value="debts">You Owe ({personalDebts.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="debtors">
                 {debtors.length > 0 ? (
                    renderDebtList(debtors, 'debtor')
                 ) : (
                    <div className="text-center text-muted-foreground py-12">
                        <p className="font-medium">No one owes you money.</p>
                        <p className="text-sm">Click "Add Record" to track money owed to you.</p>
                    </div>
                 )}
            </TabsContent>
            <TabsContent value="debts">
                 {personalDebts.length > 0 ? (
                    renderDebtList(personalDebts, 'debt')
                 ) : (
                    <div className="text-center text-muted-foreground py-12">
                        <p className="font-medium">You don't owe any money.</p>
                        <p className="text-sm">Click "Add Record" to track money you owe.</p>
                    </div>
                 )}
            </TabsContent>
        </Tabs>
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
