const express = require('express');
const db = require('../db'); 
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware')
const router = express.Router();

console.log("conditions router loaded");

// return conditions from db mapped with functional needs
router.get('/', (req, res) => {

  // base condition query
  const sql = `
    SELECT 
      condition_id,
      condition_name,
      description
    FROM conditions
  `;

  // execute base query
  db.query(sql, (err, conditions) => {
    if (err) {
      console.error('DB error fetching conditions:', err);
      return res.status(500).json({ error: 'Failed to fetch conditions' });
    }

    // error handling for no conditions
    if (conditions.length === 0) {
      return res.json([]);
    }

    let completed = 0;
    const enrichedConditions = [];

    conditions.forEach((condition) => {

      const conditionId = condition.condition_id;

      // map functional needs for each condition
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

        // error handling
        if (err) {
          console.error('Error fetching needs for condition', conditionId, ':', err);
          needs = [];
        }

        console.log(`Condition ${conditionId} needs:`, needs);

        // enrich condition object
        enrichedConditions.push({
          ...condition,
          needs: needs.map(n => ({
            name: n.need_name,
            importance: n.importance_level
          }))
        });

        completed++;

        // verify all conditions have been enriched before returning
        if (completed === conditions.length) {
          console.log('Sending enriched conditions:', enrichedConditions.length);
          res.json(enrichedConditions);
        }
      });
    });
  });
});

module.exports = router;