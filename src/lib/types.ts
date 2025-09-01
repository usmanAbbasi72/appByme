export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  date: string;
  reason: string;
  category: string;
  accountName?: string;
}

export interface Account {
  id: string;
  name: string;
}

export interface Payment {
  id: string;
  amount: number;
  date: string;
  reason?: string;
}


export interface Debt {
  id: string;
  personName: string;
  amount: number;
  reason: string;
  date: string;
  type: 'debt' | 'debtor'; // 'debt' is money I owe, 'debtor' is money owed to me
  payments: Payment[];
  paidAmount: number;
  status: 'paid' | 'unpaid';
}


export interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
}
