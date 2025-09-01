
import { useState } from 'react';
import type { Debt, Payment } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MoreVertical, Pencil, Trash2, PlusCircle, ReceiptText, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { DeleteTransactionDialog } from './DeleteTransactionDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from './ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';


interface DebtListProps {
  debtors: Debt[];
  personalDebts: Debt[];
  onEdit: (debt: Debt) => void;
  onDelete: (debtId: string) => void;
  onAdd: () => void;
  onRecordPayment: (debt: Debt) => void;
}

export function DebtList({ debtors, personalDebts, onEdit, onDelete, onAdd, onRecordPayment }: DebtListProps) {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
    const [openCollapsibles, setOpenCollapsibles] = useState<Record<string, boolean>>({});

    const toggleCollapsible = (id: string) => {
        setOpenCollapsibles(prev => ({ ...prev, [id]: !prev[id] }));
    }

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

    const renderPaymentHistory = (payments: Payment[]) => (
        <div className="pl-6 mt-2 border-l-2 border-border ml-4">
            <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Payment History</h4>
            <ul className="space-y-3">
                {payments.map(p => (
                    <li key={p.id} className="text-xs">
                        <div className="flex justify-between items-center">
                           <span className="font-medium text-foreground">{formatCurrency(p.amount)}</span>
                           <span className="text-muted-foreground">{format(new Date(p.date), 'MMM d, yyyy')}</span>
                        </div>
                        {p.reason && <p className="text-muted-foreground mt-1 italic">"{p.reason}"</p>}
                    </li>
                ))}
            </ul>
        </div>
    )

    const renderDebtList = (debts: Debt[], type: 'debtor' | 'debt') => (
         <div className="flow-root">
            <ul className="-my-4 divide-y divide-border">
            {debts.map((debt) => {
              const remainingBalance = debt.amount - (debt.paidAmount || 0);
              const isPaid = debt.status === 'paid';
              return(
              <li key={debt.id} className="flex flex-col py-4">
                <Collapsible open={openCollapsibles[debt.id]} onOpenChange={() => toggleCollapsible(debt.id)}>
                <div className="flex items-center gap-4">
                  <div className="grid gap-0.5 flex-1">
                    <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{debt.personName}</p>
                        {isPaid && <Badge variant="secondary" className="text-green-600 border-green-600">Paid</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{debt.reason}</p>
                    <p className="text-xs text-muted-foreground pt-1">
                        {format(new Date(debt.date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="text-right">
                      <p className={`font-semibold ${type === 'debtor' ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(remainingBalance)}
                      </p>
                      {!isPaid && <p className="text-xs text-muted-foreground">of {formatCurrency(debt.amount)}</p>}
                  </div>
                   <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0 flex-shrink-0">
                        <span className="sr-only">Open menu</span>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                       {!isPaid && (
                          <DropdownMenuItem onClick={() => onRecordPayment(debt)}>
                            <ReceiptText className="mr-2 h-4 w-4" />
                            Record Payment
                          </DropdownMenuItem>
                       )}
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
                </div>
                 {(debt.payments && debt.payments.length > 0) && (
                    <div className="w-full mt-2">
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-auto py-1 px-2">
                                {openCollapsibles[debt.id] ? <ChevronUp className="h-3 w-3 mr-2" /> : <ChevronDown className="h-3 w-3 mr-2" />}
                                View Payment History ({debt.payments.length})
                            </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            {renderPaymentHistory(debt.payments)}
                        </CollapsibleContent>
                    </div>
                )}
                </Collapsible>
              </li>
            )})}
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

