const db = require('../db');

// query to the db function
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

// get all games
async function findGames(limit = 20, offset = 0) {

  const sql = `
    SELECT 
      g.*,
      ge.genre_name
    FROM games g
    JOIN genres ge
      ON g.genre_id = ge.genre_id
    LIMIT ?
    OFFSET ?
  `;

  return await query(sql, [limit, offset]);
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

// find games using filters
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

  // genre filter
  if (genre) {
    sql += ` AND ge.genre_name = ? `;
    params.push(genre);
  }

  // platform filter
  if (platform) {
    // add to the original sql
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

  // feature filter
  if (features.length) {

    const featureNames = features.map(f => f.value);

    if (mustSupportAllFeatures) {

      // add to the original sql
      sql += `
        AND g.game_id IN (
          SELECT gaf.game_id
          FROM game_accessibility_features gaf
          JOIN accessibility_features f 
            ON gaf.feature_id = f.feature_id
          WHERE f.feature_name IN (?)
          GROUP BY gaf.game_id
          HAVING COUNT(DISTINCT f.feature_name) = ?
        )
      `;

      params.push(featureNames);
      params.push(featureNames.length);

    } else {

      sql += `
        AND g.game_id IN (
          SELECT gaf.game_id
          FROM game_accessibility_features gaf
          JOIN accessibility_features f
            ON gaf.feature_id = f.feature_id
          WHERE f.feature_name IN (?)
        )
      `;

      params.push(featureNames);
    }
  }

  return await query(sql, params);
}

// connect features to conditions
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
    JOIN functional_needs fn
      ON cn.need_id = fn.need_id
    JOIN feature_functional_needs ffn
      ON fn.need_id = ffn.need_id
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