function simplifyBalances(balances) {
  const creditors = [];
  const debtors = [];
  
  // Separate creditors and debtors
  for (const balance of balances) {
    const amount = Number(balance.balance);
    
    if (amount > 0.01) {
      creditors.push({ 
        userId: balance.userId, 
        name: balance.name,
        amount: amount 
      });
    } else if (amount < -0.01) {
      debtors.push({ 
        userId: balance.userId, 
        name: balance.name,
        amount: -amount 
      });
    }
  }
  
  // Sort by amount (descending)
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);
  
  const transactions = [];
  let creditorIndex = 0;
  let debtorIndex = 0;
  
  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];
    
    const settlementAmount = Math.min(creditor.amount, debtor.amount);
    
    transactions.push({
      from: debtor.userId,
      fromName: debtor.name,
      to: creditor.userId,
      toName: creditor.name,
      amount: Number(settlementAmount.toFixed(2))
    });
    
    creditor.amount -= settlementAmount;
    debtor.amount -= settlementAmount;
    
    if (creditor.amount < 0.01) {
      creditorIndex++;
    }
    
    if (debtor.amount < 0.01) {
      debtorIndex++;
    }
  }
  
  return transactions;
}

module.exports = simplifyBalances;