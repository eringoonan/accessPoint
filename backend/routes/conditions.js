const express = require('express');
const db = require('../db'); 
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware')
const router = express.Router();

console.log("conditions router loaded");

// return conditions from db mapped with functional needs (used for controllers)
router.get('/', (req, res) => {
  const sql = `
    SELECT 
      condition_id,
      condition_name,
      description
    FROM conditions
  `;

  db.query(sql, (err, conditions) => {
    if (err) {
      console.error('DB error fetching conditions:', err);
      return res.status(500).json({ error: 'Failed to fetch conditions' });
    }

    if (conditions.length === 0) {
      return res.json([]);
    }

    let completed = 0;
    const enrichedConditions = [];

    conditions.forEach((condition) => {
      const conditionId = condition.condition_id;

      const needsSql = `
        SELECT 
          fn.need_name,
          cn.importance_level
        FROM condition_needs cn
        JOIN functional_needs fn 
          ON cn.need_id = fn.need_id
        WHERE cn.condition_id = ?
      `;

      db.query(needsSql, [conditionId], (err, needs) => {
        if (err) {
          console.error('Error fetching needs for condition', conditionId, ':', err);
          needs = [];
        }

        enrichedConditions.push({
          ...condition,
          needs: needs.map(n => ({
            name: n.need_name,
            importance: n.importance_level
          }))
        });

        completed++;

        if (completed === conditions.length) {
          res.json(enrichedConditions);
        }
      });
    });
  });
});

// return conditions mapped with accessibility features (used for games filtering)
router.get('/with-features', (req, res) => {
  const sql = `
    SELECT 
      condition_id,
      condition_name,
      description
    FROM conditions
  `;

  db.query(sql, (err, conditions) => {
    if (err) {
      console.error('DB error fetching conditions:', err);
      return res.status(500).json({ error: 'Failed to fetch conditions' });
    }

    if (conditions.length === 0) {
      return res.json([]);
    }

    let completed = 0;
    const enrichedConditions = [];

    conditions.forEach((condition) => {
      const conditionId = condition.condition_id;

      const featuresSql = `
          SELECT 
              af.feature_name,
              MAX(CASE cn.importance_level
                  WHEN 'critical' THEN 2
                  WHEN 'recommended' THEN 1
                  ELSE 0
              END) AS importance_rank
          FROM condition_needs cn
          JOIN functional_needs fn 
              ON cn.need_id = fn.need_id
          JOIN feature_functional_needs ffn 
              ON fn.need_id = ffn.need_id
          JOIN accessibility_features af 
              ON ffn.feature_id = af.feature_id
          WHERE cn.condition_id = ?
          GROUP BY af.feature_name
      `;
      db.query(featuresSql, [conditionId], (err, features) => {
        if (err) {
          console.error('Error fetching features for condition', conditionId, ':', err);
          features = [];
        }

        enrichedConditions.push({
          ...condition,
          features: features.map(f => ({
              name: f.feature_name,
              importance: f.importance_rank === 2 ? 'critical' : 'recommended'
          }))
        });

        completed++;

        if (completed === conditions.length) {
          res.json(enrichedConditions);
        }
      });
    });
  });
});

// function to save user condition to the db
router.post('/add-user-conditions', authMiddleware, (req, res) => {

  const user_id = req.user.id;
  const { condition_id, severity_level } = req.body;

  if (!condition_id) {
    return res.status(400).json({ error: "condition_id is required" });
  }

  const checkQuery = `
    SELECT 1 FROM user_conditions 
    WHERE user_id = ? AND condition_id = ?
  `;

  db.query(checkQuery, [user_id, condition_id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: "DB error" });
    }

    if (results.length > 0) {
      return res.status(409).json({ error: "Condition already saved" });
    }

    // insert only after check
    const insertQuery = `
      INSERT INTO user_conditions (user_id, condition_id, severity_level) 
      VALUES (?, ?, ?)
    `;

    db.query(insertQuery, [user_id, condition_id, severity_level], (err, result) => {
      if (err) {
        return res.status(500).json({ error: "Failed to save condition" });
      }

      res.status(201).json({
        message: "Condition saved successfully",
        user_condition_id: result.insertId
      });
    });
  });
});

router.get('/get-user-conditions', authMiddleware, (req, res) => {

  const user_id = req.user.id;

  const sql = `
      SELECT 
        uc.user_condition_id,
        uc.user_id,
        uc.condition_id,
        uc.severity_level,
        c.condition_name,
        c.description
      FROM user_conditions uc
      LEFT JOIN conditions c
        ON uc.condition_id = c.condition_id
      WHERE uc.user_id = ?
    `;

  db.query(sql, [user_id], (err, results) => {
    if (err) {
      console.error('DB error while fetching conditions:', err);
      return res.status(500).json({ error: 'Failed to fetch details' });
    }

    res.status(200).json({ conditions: results });
  });
});

module.exports = router;