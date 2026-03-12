const express = require('express');
const db = require('../db'); 
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware')
const router = express.Router();
const gameService = require('../services/gameService');

console.log("Games Route Loaded");

// get games by ID
router.get('/', async (req, res) => {
  try {

    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const games = await gameService.getGames(limit, offset);

    res.json(games);

  } catch (err) {
    console.error("Game Retrieval Failed", err);
    res.status(500).json({ error: 'Retrieval failed' });
  }
});

// enrich already existing games
router.post('/enrich', async (req, res) => {
  try {

    const games = req.body;

    if (!Array.isArray(games)) {
      return res.status(400).json({ error: "Body must be an array of games" });
    }

    const enrichedGames = await gameService.enrichGames(games);

    res.json(enrichedGames);

  } catch (err) {
    console.error("Game Enrichment Failed", err);
    res.status(500).json({ error: 'Enrichment failed' });
  }
});

router.post('/search', async (req, res) => {
  try {
    const results = await gameService.searchGames(req.body);
    res.json(results);
  } catch (err) {
    console.error('Search failed:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

router.get('/test-enrich', async (req, res) => {
  try {

    // simulate games coming from DB
    const games = await gameService.getGames();

    const enriched = await gameService.enrichGames(games);

    res.json(enriched);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Test failed' });
  }
});

// Temporary test route for search
router.get('/test-search', async (req, res) => {
  try {
    // Use request body as filter input, or provide defaults for testing
    const filters = Object.keys(req.body || {}).length
      ? req.body
      : {
          features: [{ value: "Subtitles", level: 3 }],
          conditions: [],
          genre: "Souls-like",
          platform: "PlayStation 5",
          mustSupportAllFeatures: true
        };

    const results = await gameService.searchGames(filters);

    res.json(results);
  } catch (err) {
    console.error('Game search test failed:', err);
    res.status(500).json({ error: 'Game search test failed' });
  }
});

module.exports = router;
