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

export interface Debt {
  id: string;
  personName: string;
  amount: number;
  reason: string;
  date: string;
  type: 'debt' | 'debtor'; // 'debt' is money I owe, 'debtor' is money owed to me
}

export interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
}
