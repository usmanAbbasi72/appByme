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
  