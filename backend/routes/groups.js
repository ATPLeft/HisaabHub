const express = require('express');
const router = express.Router();
const db = require('../models/db');
const auth = require('../middleware/auth');
const { validateGroup } = require('../middleware/validation');
const simplify = require('../utils/simplify');

// Create group
router.post('/', auth, validateGroup, async (req, res) => {
  const userId = req.user.id;
  const { name, description } = req.body;
  
  try {
    const result = await db.query(
      'INSERT INTO groups (name, description, created_by) VALUES ($1, $2, $3) RETURNING *',
      [name, description || '', userId]
    );
    
    const group = result.rows[0];
    
    // Add creator as admin member
    await db.query(
      'INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, $3)',
      [group.id, userId, 'admin']
    );
    
    res.status(201).json(group);
  } catch (err) {
    console.error('Create group error:', err);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// List user's groups
router.get('/', auth, async (req, res) => {
  const userId = req.user.id;
  
  try {
    const result = await db.query(
      `SELECT g.*, COUNT(gm.user_id) as member_count 
       FROM groups g 
       JOIN group_members gm ON gm.group_id = g.id 
       WHERE gm.user_id = $1 
       GROUP BY g.id 
       ORDER BY g.created_at DESC`,
      [userId]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error('List groups error:', err);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// Get group details with members
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
    
    // Get group details
    const groupResult = await db.query('SELECT * FROM groups WHERE id = $1', [groupId]);
    
    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Get group members
    const membersResult = await db.query(
      `SELECT u.id, u.name, u.email, gm.role 
       FROM group_members gm 
       JOIN users u ON u.id = gm.user_id 
       WHERE gm.group_id = $1 
       ORDER BY gm.joined_at`,
      [groupId]
    );
    
    res.json({ 
      group: groupResult.rows[0], 
      members: membersResult.rows 
    });
  } catch (err) {
    console.error('Get group error:', err);
    res.status(500).json({ error: 'Failed to fetch group details' });
  }
});

// Get group balances
router.get('/:groupId/balances', auth, async (req, res) => {
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
    
    // Calculate balances with settlements
    const query = `
      SELECT u.id as user_id, u.name, 
             ((COALESCE(ep.sum_paid, 0) + COALESCE(e.sum_paid_single, 0)) - 
             COALESCE(s.sum_share, 0) +
             COALESCE(settle_received.sum_received, 0) - 
             COALESCE(settle_paid.sum_paid, 0)) AS balance
      FROM group_members gm 
      JOIN users u ON u.id = gm.user_id
      LEFT JOIN (
        SELECT ep.user_id, SUM(ep.paid_amount) as sum_paid 
        FROM expense_payers ep 
        JOIN expenses e ON ep.expense_id = e.id 
        WHERE e.group_id = $1 AND e.is_active = true
        GROUP BY ep.user_id
      ) ep ON ep.user_id = u.id
      LEFT JOIN (
        SELECT paid_by, SUM(amount) as sum_paid_single 
        FROM expenses 
        WHERE group_id = $1 AND multiple_payers = false AND is_active = true
        GROUP BY paid_by
      ) e ON e.paid_by = u.id
      LEFT JOIN (
        SELECT es.user_id, SUM(es.share_amount) as sum_share 
        FROM expense_shares es 
        JOIN expenses e ON es.expense_id = e.id 
        WHERE e.group_id = $1 AND e.is_active = true
        GROUP BY es.user_id
      ) s ON s.user_id = u.id
      LEFT JOIN (
        SELECT to_user, SUM(amount) as sum_received
        FROM settlements 
        WHERE group_id = $1
        GROUP BY to_user
      ) settle_received ON settle_received.to_user = u.id
      LEFT JOIN (
        SELECT from_user, SUM(amount) as sum_paid
        FROM settlements 
        WHERE group_id = $1
        GROUP BY from_user
      ) settle_paid ON settle_paid.from_user = u.id
      WHERE gm.group_id = $1;
    `;
    
    const result = await db.query(query, [groupId]);
    
    const balances = result.rows.map(row => ({
      userId: row.user_id,
      name: row.name,
      balance: Number(row.balance)
    }));
    
    res.json({ 
      balances, 
      simplified: simplify(balances) 
    });
  } catch (err) {
    console.error('Get balances error:', err);
    res.status(500).json({ error: 'Failed to calculate balances' });
  }
});

// Add total balances endpoint
router.get('/:groupId/total-balances', auth, async (req, res) => {
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

    // Get total expenses and member contributions
    const totalBalancesResult = await db.query(`
      SELECT 
        gm.user_id,
        u.name,
        u.email,
        COALESCE((
          SELECT SUM(amount) 
          FROM expenses 
          WHERE group_id = $1 AND is_active = true AND paid_by = gm.user_id AND multiple_payers = false
        ), 0) as total_paid,
        COALESCE((
          SELECT SUM(ep.paid_amount)
          FROM expense_payers ep
          JOIN expenses e ON ep.expense_id = e.id
          WHERE e.group_id = $1 AND e.is_active = true AND ep.user_id = gm.user_id
        ), 0) as total_paid_multiple,
        COALESCE((
          SELECT SUM(es.share_amount)
          FROM expense_shares es
          JOIN expenses e ON es.expense_id = e.id
          WHERE e.group_id = $1 AND e.is_active = true AND es.user_id = gm.user_id
        ), 0) as total_owed,
        COALESCE((
          SELECT SUM(amount) FROM settlements WHERE group_id = $1 AND from_user = gm.user_id
        ), 0) as total_settlements_paid,
        COALESCE((
          SELECT SUM(amount) FROM settlements WHERE group_id = $1 AND to_user = gm.user_id
        ), 0) as total_settlements_received
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = $1
      ORDER BY u.name
    `, [groupId]);

    const totalExpensesResult = await db.query(`
      SELECT COALESCE(SUM(amount), 0) as total_amount
      FROM expenses 
      WHERE group_id = $1 AND is_active = true
    `, [groupId]);

    const members = totalBalancesResult.rows.map(member => {
      const totalPaid = parseFloat(member.total_paid) + parseFloat(member.total_paid_multiple);
      const totalOwed = parseFloat(member.total_owed);
      const netSettlements = parseFloat(member.total_settlements_received) - parseFloat(member.total_settlements_paid);
      const currentBalance = totalPaid - totalOwed + netSettlements;

      return {
        user_id: member.user_id,
        name: member.name,
        email: member.email,
        total_paid: totalPaid.toFixed(2),
        total_owed: totalOwed.toFixed(2),
        net_settlements: netSettlements.toFixed(2),
        current_balance: currentBalance.toFixed(2),
        balance_status: currentBalance > 0 ? 'owed' : currentBalance < 0 ? 'owes' : 'settled'
      };
    });

    res.json({
      total_expenses: parseFloat(totalExpensesResult.rows[0].total_amount).toFixed(2),
      members
    });
  } catch (err) {
    console.error('Total balances error:', err);
    res.status(500).json({ error: 'Failed to calculate total balances' });
  }
});

// Add member to group
router.post('/:groupId/members', auth, async (req, res) => {
  const groupId = req.params.groupId;
  const userId = req.user.id;
  const { email } = req.body;

  try {
    // Verify user has admin access to this group
    const membership = await db.query(
      'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );
    
    if (membership.rows.length === 0 || membership.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can add members' });
    }

    // Find user by email
    const userResult = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newUserId = userResult.rows[0].id;

    // Check if user is already a member
    const existingMember = await db.query(
      'SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, newUserId]
    );

    if (existingMember.rows.length > 0) {
      return res.status(409).json({ error: 'User is already a member' });
    }

    // Add user to group
    await db.query(
      'INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, $3)',
      [groupId, newUserId, 'member']
    );

    res.status(201).json({ message: 'Member added successfully' });
  } catch (err) {
    console.error('Add member error:', err);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// Remove member from group
router.delete('/:groupId/members/:memberId', auth, async (req, res) => {
  const { groupId, memberId } = req.params;
  const userId = req.user.id;

  try {
    // Verify user has admin access
    const membership = await db.query(
      'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );
    
    if (membership.rows.length === 0 || membership.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can remove members' });
    }

    // Cannot remove yourself
    if (parseInt(memberId) === userId) {
      return res.status(400).json({ error: 'Cannot remove yourself from group' });
    }

    // Check if member has outstanding balances
    const balancesResult = await db.query(`
      SELECT COALESCE(SUM(
        (COALESCE(ep.sum_paid, 0) + COALESCE(e.sum_paid_single, 0)) - 
        COALESCE(s.sum_share, 0) +
        COALESCE(settle_received.sum_received, 0) - 
        COALESCE(settle_paid.sum_paid, 0)
      ), 0) AS balance
      FROM users u
      LEFT JOIN (
        SELECT ep.user_id, SUM(ep.paid_amount) as sum_paid 
        FROM expense_payers ep 
        JOIN expenses e ON ep.expense_id = e.id 
        WHERE e.group_id = $1 AND e.is_active = true
        GROUP BY ep.user_id
      ) ep ON ep.user_id = u.id
      LEFT JOIN (
        SELECT paid_by, SUM(amount) as sum_paid_single 
        FROM expenses 
        WHERE group_id = $1 AND multiple_payers = false AND is_active = true
        GROUP BY paid_by
      ) e ON e.paid_by = u.id
      LEFT JOIN (
        SELECT es.user_id, SUM(es.share_amount) as sum_share 
        FROM expense_shares es 
        JOIN expenses e ON es.expense_id = e.id 
        WHERE e.group_id = $1 AND e.is_active = true
        GROUP BY es.user_id
      ) s ON s.user_id = u.id
      LEFT JOIN (
        SELECT to_user, SUM(amount) as sum_received
        FROM settlements 
        WHERE group_id = $1
        GROUP BY to_user
      ) settle_received ON settle_received.to_user = u.id
      LEFT JOIN (
        SELECT from_user, SUM(amount) as sum_paid
        FROM settlements 
        WHERE group_id = $1
        GROUP BY from_user
      ) settle_paid ON settle_paid.from_user = u.id
      WHERE u.id = $2
    `, [groupId, memberId]);

    const balance = parseFloat(balancesResult.rows[0]?.balance || 0);
    
    if (Math.abs(balance) > 0.01) {
      return res.status(400).json({ 
        error: `Cannot remove member with outstanding balance of ₹${balance.toFixed(2)}` 
      });
    }

    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Remove member from expense shares
      await client.query(`
        DELETE FROM expense_shares es
        USING expenses e
        WHERE es.expense_id = e.id 
        AND e.group_id = $1 
        AND es.user_id = $2
      `, [groupId, memberId]);

      // Remove member from expense payers
      await client.query(`
        DELETE FROM expense_payers ep
        USING expenses e
        WHERE ep.expense_id = e.id 
        AND e.group_id = $1 
        AND ep.user_id = $2
      `, [groupId, memberId]);

      // Update expenses paid by this member to null
      await client.query(`
        UPDATE expenses 
        SET paid_by = NULL 
        WHERE group_id = $1 AND paid_by = $2 AND is_active = true
      `, [groupId, memberId]);

      // Remove member's settlements
      await client.query(`
        DELETE FROM settlements 
        WHERE group_id = $1 AND (from_user = $2 OR to_user = $2)
      `, [groupId, memberId]);

      // Finally remove from group members
      await client.query(
        'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2',
        [groupId, memberId]
      );

      await client.query('COMMIT');
      res.json({ message: 'Member removed successfully' });

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

  } catch (err) {
    console.error('Remove member error:', err);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

module.exports = router;