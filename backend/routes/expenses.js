const express = require('express');
const router = express.Router();
const db = require('../models/db');
const auth = require('../middleware/auth');
const { validateExpense } = require('../middleware/validation');

// Create expense with multiple payers support
router.post('/', auth, validateExpense, async (req, res) => {
  const userId = req.user.id;
  const { group_id, amount, description, shares, payers, split_method } = req.body;
  
  try {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Determine if multiple payers
      const multiplePayers = payers && Array.isArray(payers) && payers.length > 0;
      let paidByUserId = multiplePayers ? null : userId;

      // Insert expense
      const expenseResult = await client.query(
        'INSERT INTO expenses (group_id, paid_by, amount, description, multiple_payers) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [group_id, paidByUserId, amount, description, multiplePayers]
      );
      
      const expenseId = expenseResult.rows[0].id;

      // Insert payers if multiple payers
      if (multiplePayers) {
        for (const payer of payers) {
          await client.query(
            'INSERT INTO expense_payers (expense_id, user_id, paid_amount) VALUES ($1, $2, $3)',
            [expenseId, payer.user_id, payer.paid_amount]
          );
        }
      }

      // Insert shares
      for (const sh of shares) {
        await client.query(
          'INSERT INTO expense_shares (expense_id, user_id, share_amount) VALUES ($1, $2, $3)',
          [expenseId, sh.user_id, sh.share_amount]
        );
      }

      await client.query('COMMIT');
      res.json({ expenseId });

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

  } catch (err) {
    console.error('Create expense error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get expense details with payers
router.get('/:groupId', auth, async (req, res) => {
  const groupId = req.params.groupId;
  const userId = req.user.id;
  
  try {
    // Verify user has access to this group
    const membership = await db.query(
      'SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );
    
    if (membership.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this group' });
    }

    const expensesResult = await db.query(`
      SELECT 
        e.id, e.description, e.amount, e.paid_by, e.multiple_payers, e.created_at,
        u.name as paid_by_name
      FROM expenses e 
      LEFT JOIN users u ON e.paid_by = u.id
      WHERE e.group_id = $1 AND e.is_active = true
      ORDER BY e.created_at DESC
    `, [groupId]);

    const expenses = expensesResult.rows;

    // Get payers and shares for each expense
    for (let expense of expenses) {
      if (expense.multiple_payers) {
        const payersResult = await db.query(`
          SELECT ep.user_id, ep.paid_amount, u.name
          FROM expense_payers ep
          JOIN users u ON ep.user_id = u.id
          WHERE ep.expense_id = $1
        `, [expense.id]);
        expense.payers = payersResult.rows;
      }

      const sharesResult = await db.query(`
        SELECT es.user_id, es.share_amount, u.name
        FROM expense_shares es
        JOIN users u ON es.user_id = u.id
        WHERE es.expense_id = $1
      `, [expense.id]);
      expense.shares = sharesResult.rows;

      // Calculate user's share and payment status
      const userShare = expense.shares.find(s => s.user_id === userId);
      const userPaid = expense.multiple_payers 
        ? expense.payers.find(p => p.user_id === userId)
        : expense.paid_by === userId;

      expense.user_share = userShare ? userShare.share_amount : 0;
      expense.user_paid = userPaid ? (userPaid.paid_amount || expense.amount) : 0;
      expense.user_status = expense.user_paid > expense.user_share ? 'lent' : 'borrowed';
    }

    res.json(expenses);
  } catch (err) {
    console.error('Get expenses error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add expense removal endpoint
router.delete('/:expenseId', auth, async (req, res) => {
  const expenseId = req.params.expenseId;
  const userId = req.user.id;

  try {
    // Get expense details to verify ownership/access
    const expenseResult = await db.query(`
      SELECT e.*, g.created_by, gm.role 
      FROM expenses e
      JOIN groups g ON e.group_id = g.id
      JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = $1
      WHERE e.id = $2
    `, [userId, expenseId]);

    if (expenseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found or access denied' });
    }

    const expense = expenseResult.rows[0];

    // Only allow deletion by expense creator or group admin
    if (expense.paid_by !== userId && expense.role !== 'admin' && expense.created_by !== userId) {
      return res.status(403).json({ error: 'Only the expense creator or group admin can delete expenses' });
    }

    // Soft delete the expense
    await db.query(
      'UPDATE expenses SET is_active = false WHERE id = $1',
      [expenseId]
    );

    res.json({ message: 'Expense deleted successfully' });
  } catch (err) {
    console.error('Delete expense error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// New endpoint to calculate split suggestions
router.post('/:groupId/calculate-split', auth, async (req, res) => {
  const { amount, split_method, member_ids, exact_amounts } = req.body;
  
  try {
    let shares = [];

    switch (split_method) {
      case 'equal':
        const perPerson = Number(amount) / member_ids.length;
        shares = member_ids.map(id => ({
          user_id: id,
          share_amount: Number(perPerson.toFixed(2))
        }));
        break;

      case 'exact':
        if (!exact_amounts || Object.keys(exact_amounts).length === 0) {
          return res.status(400).json({ error: 'Exact amounts are required for exact split' });
        }
        
        shares = Object.entries(exact_amounts).map(([user_id, share_amount]) => ({
          user_id: parseInt(user_id),
          share_amount: Number(share_amount)
        }));
        break;

      case 'percentage':
        const percentages = req.body.percentages || [];
        shares = member_ids.map((id, index) => ({
          user_id: id,
          share_amount: Number((amount * (percentages[index] || 0) / 100).toFixed(2))
        }));
        break;

      default:
        return res.status(400).json({ error: 'Invalid split method' });
    }

    // Validate shares sum to amount
    const total = shares.reduce((sum, share) => sum + share.share_amount, 0);
    if (Math.abs(total - amount) > 0.01) {
      return res.status(400).json({ error: 'Shares do not sum to total amount' });
    }

    res.json({ shares });
  } catch (err) {
    console.error('Calculate split error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;