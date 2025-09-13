import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';

export default function Group() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('expenses');
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [simplified, setSimplified] = useState([]);
  const [totalBalances, setTotalBalances] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [settleAmount, setSettleAmount] = useState({});
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState(null);

  // Expense form state
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [splitMethod, setSplitMethod] = useState('equal');
  const [selectedPayer, setSelectedPayer] = useState('');
  const [multiplePayers, setMultiplePayers] = useState(false);
  const [payers, setPayers] = useState([]);
  const [exactAmounts, setExactAmounts] = useState({});

  const currentUserId = parseInt(localStorage.getItem('userId'));

  useEffect(() => {
    load();
  }, [id, activeTab]);

  async function load() {
    try {
      setLoading(true);
      setError('');

      const [g, b] = await Promise.all([
        api.groups.get(id),
        api.groups.balances(id)
      ]);

      setGroup(g.data.group);
      setMembers(g.data.members);
      setBalances(b.data.balances);
      setSimplified(b.data.simplified);

      // Load data based on active tab
      if (activeTab === 'expenses') {
        const e = await api.expenses.list(id);
        setExpenses(e.data);
      } else if (activeTab === 'totals') {
        const totals = await api.groups.totalBalances(id);
        setTotalBalances(totals.data);
      }

      // Set default payer to current user
      if (currentUserId) {
        setSelectedPayer(currentUserId);
      }
    } catch (err) {
      setError('Failed to load group data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function addMember() {
    if (!newMemberEmail.trim()) {
      setError('Please enter an email address');
      return;
    }

    try {
      setError('');
      await api.groups.addMember(id, { email: newMemberEmail.trim() });
      setNewMemberEmail('');
      setShowAddMember(false);
      setSuccess('Member added successfully');
      setTimeout(() => setSuccess(''), 3000);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add member');
    }
  }

  async function removeMember(memberId) {
    if (!window.confirm('Are you sure you want to remove this member? All their expenses and settlements will be removed.')) {
      return;
    }

    try {
      await api.groups.removeMember(id, memberId);
      setSuccess('Member removed successfully');
      setTimeout(() => setSuccess(''), 3000);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove member');
    }
  }

  async function deleteExpense(expenseId) {
    if (!window.confirm('Are you sure you want to delete this expense?')) {
      return;
    }

    try {
      await api.expenses.delete(expenseId);
      setSuccess('Expense deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete expense');
    }
  }

  async function settleUp(settlement) {
    setSelectedSettlement(settlement);
    setSettleAmount({ [settlement.to]: settlement.amount });
    setShowSettleModal(true);
  }

  async function confirmSettlement() {
    if (!selectedSettlement || !settleAmount[selectedSettlement.to]) {
      setError('Please enter a valid settlement amount');
      return;
    }

    const amount = parseFloat(settleAmount[selectedSettlement.to]);
    if (amount <= 0 || amount > selectedSettlement.amount) {
      setError(`Amount must be between 0 and ₹${selectedSettlement.amount}`);
      return;
    }

    try {
      const response = await api.payments.settle({
        to_user: selectedSettlement.to,
        amount: amount,
        group_id: id,
        description: `Settlement with ${selectedSettlement.toName}`
      });

      setSuccess(response.data.message);
      setTimeout(() => setSuccess(''), 3000);
      setShowSettleModal(false);
      setSelectedSettlement(null);
      setSettleAmount({});
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record settlement');
    }
  }

  async function calculateSplit() {
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (members.length === 0) {
      setError('No members in this group');
      return;
    }

    try {
      const memberIds = members.map(m => m.id);
      const requestData = {
        amount: Number(amount),
        split_method: splitMethod,
        member_ids: memberIds
      };

      if (splitMethod === 'exact') {
        requestData.exact_amounts = exactAmounts;
      }

      const response = await api.expenses.calculateSplit(id, requestData);
      
      if (splitMethod === 'exact') {
        // For exact split, we use the amounts user entered
        const shares = {};
        response.data.shares.forEach(share => {
          shares[share.user_id] = share.share_amount;
        });
        // Keep user's exact amounts but validate sum
        const total = Object.values(exactAmounts).reduce((sum, amt) => sum + parseFloat(amt || 0), 0);
        if (Math.abs(total - amount) > 0.01) {
          setError(`Exact amounts sum to ₹${total.toFixed(2)} but should sum to ₹${amount}`);
          return;
        }
      } else {
        // For other methods, use calculated shares
        const shares = {};
        response.data.shares.forEach(share => {
          shares[share.user_id] = share.share_amount;
        });
        setExactAmounts(shares);
      }

    } catch (err) {
      setError(err.response?.data?.error || 'Failed to calculate split');
    }
  }

  async function addExpense(evn) {
    evn.preventDefault();

    if (!desc.trim() || !amount || isNaN(amount) || Number(amount) <= 0) {
      setError('Please provide a valid description and amount');
      return;
    }

    if (members.length === 0) {
      setError('No members in this group');
      return;
    }

    try {
      setError('');

      let expenseData = {
        group_id: id,
        amount: Number(amount),
        description: desc.trim(),
        split_method: splitMethod
      };

      // Prepare shares based on split method
      let shares = [];
      if (splitMethod === 'equal') {
        const perPerson = Number(amount) / members.length;
        shares = members.map(m => ({
          user_id: m.id,
          share_amount: Number(perPerson.toFixed(2))
        }));
      } else if (splitMethod === 'exact') {
        shares = Object.entries(exactAmounts).map(([userId, shareAmount]) => ({
          user_id: parseInt(userId),
          share_amount: Number(shareAmount)
        }));
      }

      expenseData.shares = shares;

      // Handle payers
      if (multiplePayers && payers.length > 0) {
        expenseData.payers = payers.filter(p => p.user_id && p.paid_amount);
      } else if (selectedPayer) {
        expenseData.paid_by = selectedPayer;
      }

      await api.expenses.create(expenseData);

      // Reset form
      setDesc('');
      setAmount('');
      setExactAmounts({});
      setPayers([]);
      setSelectedPayer(currentUserId);
      setSplitMethod('equal');
      setMultiplePayers(false);

      setSuccess('Expense added successfully');
      setTimeout(() => setSuccess(''), 3000);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add expense');
    }
  }

  const addPayer = () => {
    if (payers.length < members.length) {
      setPayers([...payers, { user_id: '', paid_amount: '' }]);
    }
  };

  const updatePayer = (index, field, value) => {
    const updatedPayers = [...payers];
    updatedPayers[index][field] = value;
    setPayers(updatedPayers);
  };

  const removePayer = (index) => {
    setPayers(payers.filter((_, i) => i !== index));
  };

  const updateExactAmount = (userId, value) => {
    setExactAmounts(prev => ({
      ...prev,
      [userId]: value
    }));
  };

  const getBalanceForUser = (userId) => {
    const balance = balances.find(b => b.userId === userId);
    return balance ? balance.balance : 0;
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading group data...</div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Tab Navigation */}
      <div className="tab-navigation" style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          className={`tab-button ${activeTab === 'expenses' ? 'active' : ''}`}
          onClick={() => setActiveTab('expenses')}
        >
          Expenses
        </button>
        <button
          className={`tab-button ${activeTab === 'totals' ? 'active' : ''}`}
          onClick={() => setActiveTab('totals')}
        >
          Total Spending
        </button>
        <button
          className={`tab-button ${activeTab === 'settle' ? 'active' : ''}`}
          onClick={() => setActiveTab('settle')}
        >
          Settle Up
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {activeTab === 'expenses' && (
        <div className="grid">
          {/* Left column - Group info, Add expense form */}
          <div>
            <div className="card">
              <h2>{group?.name}</h2>
              <div className="small">{group?.description || 'No description'}</div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4>Members ({members.length})</h4>
                {group?.created_by === currentUserId && (
                  <button
                    className="button"
                    onClick={() => setShowAddMember(!showAddMember)}
                    style={{ padding: '8px 12px' }}
                  >
                    {showAddMember ? 'Cancel' : 'Add Member'}
                  </button>
                )}
              </div>

              {showAddMember && (
                <div style={{ marginBottom: '16px', padding: '12px', border: '1px solid #eee', borderRadius: '4px' }}>
                  <input
                    className="input"
                    placeholder="Member email"
                    value={newMemberEmail}
                    onChange={e => setNewMemberEmail(e.target.value)}
                    style={{ marginBottom: '8px' }}
                  />
                  <button className="button" onClick={addMember}>
                    Add Member
                  </button>
                </div>
              )}

              <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                {members.map(m => (
                  <li key={m.id} style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>
                      {m.name} <span className="small">({m.email})</span>
                      {m.role === 'admin' && ' 👑'}
                    </span>
                    {group?.created_by === currentUserId && m.id !== currentUserId && (
                      <button
                        onClick={() => removeMember(m.id)}
                        className="delete-btn"
                      >
                        Remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Add Expense Form */}
            <div className="card">
              <h3>Add Expense</h3>
              <form onSubmit={addExpense}>
                <input
                  className="input"
                  placeholder="Description"
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                />

                <div style={{ height: '8px' }}></div>

                <input
                  className="input"
                  placeholder="Amount (₹)"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />

                <div style={{ height: '8px' }}></div>

                {/* Split Method Selection */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Split Method:</label>
                  <select
                    className="input"
                    value={splitMethod}
                    onChange={e => setSplitMethod(e.target.value)}
                  >
                    <option value="equal">Equal Split</option>
                    <option value="exact">Exact Amounts</option>
                    <option value="percentage">Percentage</option>
                  </select>
                </div>

                {/* Payer Selection */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                    <input
                      type="checkbox"
                      checked={multiplePayers}
                      onChange={e => setMultiplePayers(e.target.checked)}
                      style={{ marginRight: '8px' }}
                    />
                    Multiple Payers
                  </label>

                  {!multiplePayers ? (
                    <select
                      className="input"
                      value={selectedPayer}
                      onChange={e => setSelectedPayer(e.target.value)}
                    >
                      {members.map(member => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div>
                      {payers.map((payer, index) => (
                        <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                          <select
                            className="input"
                            value={payer.user_id}
                            onChange={e => updatePayer(index, 'user_id', e.target.value)}
                            style={{ flex: 1 }}
                          >
                            <option value="">Select payer</option>
                            {members.map(member => (
                              <option key={member.id} value={member.id}>
                                {member.name}
                              </option>
                            ))}
                          </select>
                          <input
                            className="input"
                            type="number"
                            step="0.01"
                            placeholder="Amount paid"
                            value={payer.paid_amount}
                            onChange={e => updatePayer(index, 'paid_amount', e.target.value)}
                            style={{ width: '100px' }}
                          />
                          <button
                            type="button"
                            onClick={() => removePayer(index)}
                            className="delete-btn"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button type="button" onClick={addPayer} className="button" style={{ marginTop: '8px' }}>
                        Add Payer
                      </button>
                    </div>
                  )}
                </div>

                {/* Exact Amounts Input */}
                {splitMethod === 'exact' && (
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Exact Amounts:</label>
                    {members.map(member => (
                      <div key={member.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ minWidth: '100px' }}>{member.name}:</span>
                        <input
                          className="input"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={exactAmounts[member.id] || ''}
                          onChange={e => updateExactAmount(member.id, e.target.value)}
                          style={{ width: '100px', marginLeft: '8px' }}
                        />
                        <span className="small" style={{ marginLeft: '8px' }}>₹</span>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  className="button"
                  type="button"
                  onClick={calculateSplit}
                  disabled={!amount || isNaN(amount) || Number(amount) <= 0}
                  style={{ marginRight: '8px', marginBottom: '8px' }}
                >
                  Calculate Split
                </button>

                <button
                  className="button"
                  type="submit"
                  disabled={!desc.trim() || !amount || isNaN(amount) || Number(amount) <= 0}
                >
                  Add Expense
                </button>
              </form>
            </div>

            {/* Expenses List */}
            <div className="card">
              <h3>Expenses</h3>
              {expenses.length === 0 ? (
                <div className="small">No expenses yet</div>
              ) : (
                expenses.map(ex => (
                  <div key={ex.id} style={{ padding: '12px 0', borderBottom: '1px dashed #eee', position: 'relative' }}>
                    {(ex.paid_by === currentUserId || group?.created_by === currentUserId) && (
                      <button
                        onClick={() => deleteExpense(ex.id)}
                        className="delete-btn"
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px'
                        }}
                      >
                        ×
                      </button>
                    )}

                    <div><strong>{ex.description}</strong></div>
                    <div className="small">₹{Number(ex.amount).toFixed(2)}</div>

                    {ex.multiple_payers ? (
                      <div className="small">
                        Paid by: {ex.payers?.map(p => `${p.name} (₹${p.paid_amount})`).join(', ')}
                      </div>
                    ) : (
                      <div className="small">Paid by: {ex.paid_by_name}</div>
                    )}

                    <div className="small" style={{ marginTop: '4px' }}>
                      Split: {ex.shares?.map(s => `${s.name}: ₹${s.share_amount}`).join(', ')}
                    </div>

                    {ex.user_status && (
                      <div className="small" style={{
                        marginTop: '4px',
                        color: ex.user_status === 'lent' ? '#10b981' : '#ef4444',
                        fontWeight: 'bold'
                      }}>
                        {ex.user_status === 'lent' ? 'You lent ₹' : 'You borrowed ₹'}
                        {Math.abs(ex.user_paid - ex.user_share).toFixed(2)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right column - Balances and Settlements */}
          <div>
            <div className="card">
              <h3>Current Balances</h3>
              {balances.length === 0 ? (
                <div className="small">No balances to show</div>
              ) : (
                balances.map(b => {
                  const mem = members.find(m => m.id === b.userId);
                  const balance = Number(b.balance);
                  const isCurrentUser = b.userId === currentUserId;

                  if (isCurrentUser) {
                    return (
                      <div key={b.userId} style={{ padding: '8px', background: '#f8f9fa', borderRadius: '4px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>Your balance:</span>
                          <span style={{
                            color: balance > 0 ? '#10b981' : balance < 0 ? '#ef4444' : '#6b7280',
                            fontWeight: 'bold'
                          }}>
                            {balance > 0 ? `You are owed ₹${Math.abs(balance).toFixed(2)}` :
                             balance < 0 ? `You owe ₹${Math.abs(balance).toFixed(2)}` :
                             'Settled up'}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={b.userId} style={{ padding: '6px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{mem?.name || b.userId}</span>
                      <span style={{ color: balance > 0 ? '#10b981' : '#ef4444' }}>
                        {balance > 0 ? `Owes you ₹${balance.toFixed(2)}` : `You owe ₹${Math.abs(balance).toFixed(2)}`}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="card">
              <h3>Suggested Settlements</h3>
              {simplified.length === 0 ? (
                <div className="small">All settled up!</div>
              ) : (
                <ul style={{ paddingLeft: '0', margin: 0, listStyle: 'none' }}>
                  {simplified.map((t, i) => {
                    const isCurrentUserOwed = t.to === currentUserId;
                    const isCurrentUserPaying = t.from === currentUserId;

                    if (isCurrentUserOwed) {
                      return (
                        <li key={i} style={{ marginBottom: '12px', padding: '12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                          <div style={{ fontWeight: 'bold', color: '#15803d' }}>
                            {t.fromName} owes you ₹{t.amount.toFixed(2)}
                          </div>
                          <button
                            className="button"
                            onClick={() => settleUp(t)}
                            style={{ marginTop: '8px', background: '#10b981' }}
                          >
                            Settle Up
                          </button>
                        </li>
                      );
                    } else if (isCurrentUserPaying) {
                      return (
                        <li key={i} style={{ marginBottom: '12px', padding: '12px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                          <div style={{ fontWeight: 'bold', color: '#dc2626' }}>
                            You owe {t.toName} ₹{t.amount.toFixed(2)}
                          </div>
                          <button
                            className="button"
                            onClick={() => settleUp(t)}
                            style={{ marginTop: '8px', background: '#ef4444' }}
                          >
                            Settle Now
                          </button>
                        </li>
                      );
                    }

                    return (
                      <li key={i} style={{ marginBottom: '8px', padding: '8px', background: '#f8f9fa', borderRadius: '4px' }}>
                        <div className="small">
                          <strong>{t.fromName}</strong> owes <strong>{t.toName}</strong> ₹{t.amount.toFixed(2)}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'totals' && totalBalances && (
        <div className="card">
          <h2>Total Spending</h2>
          <div style={{ marginBottom: '20px', padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 8px 0' }}>Group Total: ₹{totalBalances.total_expenses}</h3>
            <div className="small">Total amount spent in this group</div>
          </div>

          <div style={{ display: 'grid', gap: '16px' }}>
            {totalBalances.members.map(member => {
              const isCurrentUser = member.user_id === currentUserId;
              return (
                <div key={member.user_id} style={{
                  padding: '16px',
                  border: '1px solid #e9ecef',
                  borderRadius: '8px',
                  background: '#fff'
                }}>
                  <h4 style={{ margin: '0 0 12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{member.name} {isCurrentUser && '(You)'}</span>
                    <span style={{
                      color: member.balance_status === 'owed' ? '#10b981' :
                             member.balance_status === 'owes' ? '#ef4444' : '#6b7280',
                      fontSize: '0.9em'
                    }}>
                      {member.balance_status === 'owed' ? `Owes you ₹${member.current_balance}` :
                       member.balance_status === 'owes' ? `You owe ₹${Math.abs(parseFloat(member.current_balance)).toFixed(2)}` :
                       'Settled up'}
                    </span>
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ padding: '8px', background: '#f8f9fa', borderRadius: '4px' }}>
                      <div className="small" style={{ fontWeight: 'bold' }}>Total Paid</div>
                      <div>₹{member.total_paid}</div>
                    </div>
                    <div style={{ padding: '8px', background: '#f8f9fa', borderRadius: '4px' }}>
                      <div className="small" style={{ fontWeight: 'bold' }}>Total Share</div>
                      <div>₹{member.total_owed}</div>
                    </div>
                    <div style={{ padding: '8px', background: '#f8f9fa', borderRadius: '4px' }}>
                      <div className="small" style={{ fontWeight: 'bold' }}>Net Settlements</div>
                      <div style={{ color: parseFloat(member.net_settlements) > 0 ? '#10b981' : '#ef4444' }}>
                        {parseFloat(member.net_settlements) > 0 ? '+' : ''}₹{member.net_settlements}
                      </div>
                    </div>
                    <div style={{ padding: '8px', background: '#f8f9fa', borderRadius: '4px' }}>
                      <div className="small" style={{ fontWeight: 'bold' }}>Current Balance</div>
                      <div style={{
                        color: member.balance_status === 'owed' ? '#10b981' :
                               member.balance_status === 'owes' ? '#ef4444' : '#6b7280',
                        fontWeight: 'bold'
                      }}>
                        {member.balance_status === 'owed' ? `+₹${member.current_balance}` :
                         member.balance_status === 'owes' ? `-₹${Math.abs(parseFloat(member.current_balance)).toFixed(2)}` :
                         '₹0.00'}
                      </div>
                    </div>
                  </div>

                  {isCurrentUser && (
                    <div style={{ marginTop: '12px', padding: '8px', background: '#fffbeb', borderRadius: '4px' }}>
                      <div className="small">
                        <strong>Your Summary:</strong> You've paid ₹{member.total_paid} and your share is ₹{member.total_owed}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'settle' && (
        <div className="card">
          <h2>Settle Up</h2>
          <p className="small">Record payments to settle balances with other members</p>

          <div style={{ marginTop: '20px' }}>
            <h4>Your Balances</h4>
            {balances.filter(b => b.userId !== currentUserId).length === 0 ? (
              <div className="small">No balances to settle</div>
            ) : (
              <div style={{ display: 'grid', gap: '12px', marginTop: '12px' }}>
                {balances
                  .filter(b => b.userId !== currentUserId && Math.abs(b.balance) > 0.01)
                  .map(balance => {
                    const member = members.find(m => m.id === balance.userId);
                    const amount = Math.abs(balance.balance);
                    const isOwed = balance.balance > 0;

                    return (
                      <div key={balance.userId} style={{
                        padding: '16px',
                        border: '1px solid #e9ecef',
                        borderRadius: '8px',
                        background: isOwed ? '#f0fdf4' : '#fef2f2'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <div>
                            <strong>{member?.name}</strong>
                            <div style={{
                              color: isOwed ? '#15803d' : '#dc2626',
                              fontWeight: 'bold'
                            }}>
                              {isOwed ? `Owes you ₹${amount.toFixed(2)}` : `You owe ₹${amount.toFixed(2)}`}
                            </div>
                          </div>
                          <button
                            className="button"
                            onClick={() => settleUp({
                              from: isOwed ? balance.userId : currentUserId,
                              fromName: isOwed ? member?.name : 'You',
                              to: isOwed ? currentUserId : balance.userId,
                              toName: isOwed ? 'You' : member?.name,
                              amount: amount
                            })}
                            style={{ background: isOwed ? '#10b981' : '#ef4444' }}
                          >
                            Settle
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settlement Modal */}
      {showSettleModal && selectedSettlement && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            width: '90%',
            maxWidth: '400px'
          }}>
            <h3>Settle Balance</h3>
            <p>
              {selectedSettlement.fromName} → {selectedSettlement.toName}: ₹{selectedSettlement.amount.toFixed(2)}
            </p>

            <div style={{ margin: '16px 0' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Amount to settle (₹):
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={selectedSettlement.amount}
                value={settleAmount[selectedSettlement.to] || ''}
                onChange={e => setSettleAmount({ [selectedSettlement.to]: e.target.value })}
                className="input"
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowSettleModal(false);
                  setSelectedSettlement(null);
                  setSettleAmount({});
                }}
                className="button"
                style={{ background: '#6b7280' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmSettlement}
                className="button"
                disabled={!settleAmount[selectedSettlement.to] || parseFloat(settleAmount[selectedSettlement.to]) <= 0}
              >
                Confirm Settlement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}