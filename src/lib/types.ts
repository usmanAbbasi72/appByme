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

export interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
}
