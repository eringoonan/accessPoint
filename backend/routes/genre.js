const express = require('express');
const db = require('../db'); 
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware')
const router = express.Router();
const gameService = require('../services/gameService');

console.log("Genre Route Loaded");

router.get('/', async (req, res) => {
  try {

    const sql = `
      SELECT
        genre_id,
        genre_name
      FROM genres
    `;

    db.query(sql, (err, results) => {
      if (err) {
        console.error("Genre Retrieval Failed", err);
        return res.status(500).json({ error: 'Retrieval failed' });
      }

      res.json(results);
    });

  } catch (err) {
    console.error("Unexpected Error", err);
    res.status(500).json({ error: 'Unexpected error' });
  }
});

module.exports = router;