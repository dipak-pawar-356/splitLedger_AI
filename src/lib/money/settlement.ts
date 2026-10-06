// Settlement calculation algorithm using debt simplification
// This implements the minimum number of transactions to settle all debts

interface Balance {
  userId: number;
  contactId?: number;
  balance: number; // positive = owed to, negative = owes
}

interface Settlement {
  fromUserId?: number;
  fromContactId?: number;
  toUserId?: number;
  toContactId?: number;
  amount: number;
}

export function calculateSettlements(balances: Balance[]): Settlement[] {
  const settlements: Settlement[] = [];
  
  // Separate debtors and creditors
  const debtors: Balance[] = balances.filter(b => b.balance < 0);
  const creditors: Balance[] = balances.filter(b => b.balance > 0);
  
  // Sort by amount (largest first for optimal matching)
  debtors.sort((a, b) => a.balance - b.balance);
  creditors.sort((a, b) => b.balance - a.balance);
  
  let i = 0; // debtor index
  let j = 0; // creditor index
  
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    
    // Calculate settlement amount
    const amount = Math.min(Math.abs(debtor.balance), creditor.balance);
    
    if (amount > 0) {
      settlements.push({
        fromUserId: debtor.userId,
        fromContactId: debtor.contactId,
        toUserId: creditor.userId,
        toContactId: creditor.contactId,
        amount: Math.round(amount * 100) / 100, // Round to 2 decimal places
      });
      
      // Update balances
      debtor.balance += amount;
      creditor.balance -= amount;
    }
    
    // Move to next if settled
    if (Math.abs(debtor.balance) < 0.01) i++;
    if (creditor.balance < 0.01) j++;
  }
  
  return settlements;
}

export function calculateBalances(transactions: any[]): Balance[] {
  const balanceMap = new Map<string, Balance>();
  
  transactions.forEach(tx => {
    const key = tx.userId ? `user-${tx.userId}` : `contact-${tx.contactId}`;
    const current = balanceMap.get(key) || { 
      userId: tx.userId || 0, 
      contactId: tx.contactId, 
      balance: 0 
    };
    
    // Calculate balance based on transaction type
    switch (tx.type) {
      case 'paid':
        current.balance -= tx.amount;
        break;
      case 'received':
        current.balance += tx.amount;
        break;
      case 'lent':
        current.balance += tx.amount;
        break;
      case 'borrowed':
        current.balance -= tx.amount;
        break;
      case 'repaid':
        current.balance -= tx.amount;
        break;
    }
    
    balanceMap.set(key, current);
  });
  
  return Array.from(balanceMap.values()).filter(b => Math.abs(b.balance) > 0.01);
}
