const express = require('express');
const router = express.Router();
const db = require('../models/db');
const auth = require('../middleware/auth');

// Record settlement payment
router.post('/settle', auth, async (req, res) => {
  const fromUserId = req.user.id;
  const { to_user, amount, group_id, description } = req.body;
  
  if (!to_user || !amount || !group_id) {
    return res.status(400).json({ error: 'to_user, amount, and group_id are required' });
  }

  if (amount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0' });
  }

  try {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Record the settlement
      const settlementResult = await client.query(
        `INSERT INTO settlements (group_id, from_user, to_user, amount, description) 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [group_id, fromUserId, to_user, amount, description || 'Settlement payment']
      );

      await client.query('COMMIT');
      
      res.json({ 
        ok: true, 
        settlement: settlementResult.rows[0],
        message: 'Settlement recorded successfully' 
      });

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

  } catch (err) {
    console.error('Settlement error:', err);
    res.status(500).json({ error: 'Server error during settlement' });
  }
});

// Get settlement history for group
router.get('/settlements/:groupId', auth, async (req, res) => {
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

    const settlementsResult = await db.query(`
      SELECT s.*, 
             from_u.name as from_user_name,
             to_u.name as to_user_name
      FROM settlements s
      JOIN users from_u ON s.from_user = from_u.id
      JOIN users to_u ON s.to_user = to_u.id
      WHERE s.group_id = $1
      ORDER BY s.created_at DESC
    `, [groupId]);

    res.json(settlementsResult.rows);
  } catch (err) {
    console.error('Get settlements error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Existing payment endpoints
router.post('/', auth, async (req, res) => {
  const from = req.user.id;
  const { to_user, amount, group_id, method } = req.body;
  if(!to_user || !amount) return res.status(400).json({ error:'to_user and amount required' });
  try{
    await db.query('INSERT INTO payments (from_user,to_user,amount,group_id,method) VALUES ($1,$2,$3,$4,$5)',[from,to_user,amount,group_id,method]);
    res.json({ ok:true });
  }catch(err){ console.error(err); res.status(500).json({ error:'server error' }); }
});

router.get('/me', auth, async (req, res) => {
  const uid = req.user.id;
  try{
    const r = await db.query('SELECT * FROM payments WHERE from_user=$1 OR to_user=$1 ORDER BY created_at DESC',[uid]);
    res.json(r.rows);
  }catch(err){ console.error(err); res.status(500).json({ error:'server error' }); }
});

module.exports = router;