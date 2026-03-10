const db = require('../db');

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

// get all games
async function findGames() {
  const sql = `
    SELECT 
      g.*,
      ge.genre_name
    FROM games g
    JOIN genres ge
      ON g.genre_id = ge.genre_id
  `;

  return await query(sql);
}


// get platforms for provided games
async function findPlatformsForGames(gameIds) {

  const sql = `
    SELECT
      gp.game_id,
      p.platform_id,
      p.platform_name,
      p.manufacturer,
      p.platform_type
    FROM game_platforms gp
    JOIN platforms p
      ON gp.platform_id = p.platform_id
    WHERE gp.game_id IN (?)
  `;

  return await query(sql, [gameIds]);
}


// get accessibility features for provided games
async function findFeaturesForGames(gameIds) {

  const sql = `
    SELECT
      gaf.game_id,
      af.feature_id,
      af.feature_name,
      af.description,
      gaf.implementation_quality,
      gaf.notes
    FROM game_accessibility_features gaf
    JOIN accessibility_features af
      ON gaf.feature_id = af.feature_id
    WHERE gaf.game_id IN (?)
  `;

  return await query(sql, [gameIds]);
}

async function findFilteredGames(filters) {

  const {
    features = [],
    genre = null,
    platform = null,
    mustSupportAllFeatures = true
  } = filters;

  let sql = `
    SELECT DISTINCT g.*, ge.genre_name
    FROM games g
    JOIN genres ge ON g.genre_id = ge.genre_id
    WHERE 1=1
  `;

  const params = [];

  // GENRE FILTER
  if (genre) {
    sql += ` AND ge.genre_name = ? `;
    params.push(genre);
  }

  // PLATFORM FILTER (single select)
  if (platform) {

    sql += `
      AND g.game_id IN (
        SELECT gp.game_id
        FROM game_platforms gp
        JOIN platforms p ON gp.platform_id = p.platform_id
        WHERE p.platform_name = ?
      )
    `;

    params.push(platform);
  }

  // FEATURE FILTER
  if (features.length) {

    const featureNames = features.map(f => f.value);

    if (mustSupportAllFeatures) {

      sql += `
        AND g.game_id IN (
          SELECT gf.game_id
          FROM game_features gf
          JOIN features f ON gf.feature_id = f.feature_id
          WHERE f.feature_name IN (?)
          GROUP BY gf.game_id
          HAVING COUNT(DISTINCT f.feature_name) = ?
        )
      `;

      params.push(featureNames);
      params.push(featureNames.length);

    } else {

      sql += `
        AND g.game_id IN (
          SELECT gf.game_id
          FROM game_features gf
          JOIN features f ON gf.feature_id = f.feature_id
          WHERE f.feature_name IN (?)
        )
      `;

      params.push(featureNames);
    }
  }

  return await query(sql, params);
}

async function getFeaturesForConditions(conditionNames = []) {

  if (!conditionNames.length) return [];

  const placeholders = conditionNames.map(() => '?').join(',');

  const sql = `
    SELECT 
      c.condition_name,
      f.feature_name,
      CASE 
        WHEN cn.importance_level = 'critical' THEN 3
        WHEN cn.importance_level = 'recommended' THEN 2
        WHEN cn.importance_level = 'optional' THEN 1
        ELSE 1
      END AS importanceWeight
    FROM conditions c

    JOIN condition_needs cn
      ON c.condition_id = cn.condition_id

    JOIN needs n
      ON cn.need_id = n.need_id

    JOIN feature_functional_needs ffn
      ON n.need_id = ffn.need_id

    JOIN accessibility_features f
      ON ffn.feature_id = f.feature_id

    WHERE c.condition_name IN (${placeholders})
  `;

  return await query(sql, conditionNames);
}

module.exports = {
  findGames,
  findPlatformsForGames,
  findFeaturesForGames,
  findFilteredGames,
  getFeaturesForConditions
};