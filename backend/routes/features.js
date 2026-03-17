const express = require('express');
const db = require('../db'); 
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware')
const router = express.Router();

console.log("features router loaded");

router.get('/', (req, res) => {

  const sql = `
    SELECT
      feature_id,
      feature_name,
      description
    FROM accessibility_features
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Feature Retrieval Failed", err);
      return res.status(500).json({ error: "Retrieval failed" });
    }

    res.json(results);
  });

});

module.exports = router;