// /repositories/controllerRepository.js
const db = require('../db');

// query helper
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

// hard filter by platforms and functional needs
async function findFilteredControllers(filters) {
  const { platforms = [], needs = [], mustSupportAll = true } = filters;

  let sql = `
    SELECT DISTINCT c.*
    FROM controllers c
    WHERE 1=1
  `;

  const params = [];

  // platform filter
  if (platforms.length) {
    const platformNames = platforms.map(p => p.value);

    if (mustSupportAll) {
      sql += `
        AND c.controller_id IN (
          SELECT cp.controller_id
          FROM controller_platforms cp
          JOIN platforms p ON cp.platform_id = p.platform_id
          WHERE p.platform_name IN (?)
          GROUP BY cp.controller_id
          HAVING COUNT(DISTINCT p.platform_name) = ?
        )
      `;
      params.push(platformNames);
      params.push(platformNames.length);
    } else {
      sql += `
        AND c.controller_id IN (
          SELECT cp.controller_id
          FROM controller_platforms cp
          JOIN platforms p ON cp.platform_id = p.platform_id
          WHERE p.platform_name IN (?)
        )
      `;
      params.push(platformNames);
    }
  }

  // needs filter
  if (needs.length) {
    const needNames = needs.map(n => n.value);

    sql += `
      AND c.controller_id IN (
        SELECT cn.controller_id
        FROM controller_needs cn
        JOIN functional_needs fn ON cn.need_id = fn.need_id
        WHERE fn.need_name IN (?)
        GROUP BY cn.controller_id
        HAVING COUNT(DISTINCT fn.need_name) = ?
      )
    `;
    params.push(needNames);
    params.push(needNames.length);
  }

  return await query(sql, params);
}

// fetch all needs + platforms for given controllers
async function enrichControllers(baseControllers) {
  if (!baseControllers.length) return [];

  const controllerIds = baseControllers.map(c => c.controller_id);

  // fetch all platforms
  const platformSql = `
    SELECT 
      cp.controller_id,
      p.platform_name,
      cp.compatibility_notes,
      cp.requires_adapter
    FROM controller_platforms cp
    JOIN platforms p ON cp.platform_id = p.platform_id
    WHERE cp.controller_id IN (?)
  `;
  const platforms = await query(platformSql, [controllerIds]);

  // fetch all needs
  const needsSql = `
    SELECT 
      cn.controller_id,
      fn.need_name,
      cn.suitability
    FROM controller_needs cn
    JOIN functional_needs fn ON cn.need_id = fn.need_id
    WHERE cn.controller_id IN (?)
  `;
  const needs = await query(needsSql, [controllerIds]);

  // group platforms by controller
  const platformMap = {};
  platforms.forEach(p => {
    if (!platformMap[p.controller_id]) platformMap[p.controller_id] = [];
    platformMap[p.controller_id].push({
      name: p.platform_name,
      compatibility_notes: p.compatibility_notes,
      requires_adapter: p.requires_adapter === 1
    });
  });

  // group needs by controller
  const needMap = {};
  needs.forEach(n => {
    if (!needMap[n.controller_id]) needMap[n.controller_id] = [];
    needMap[n.controller_id].push({
      name: n.need_name,
      suitability: n.suitability
    });
  });

  return baseControllers.map(controller => ({
    ...controller,
    platforms: platformMap[controller.controller_id] || [],
    needs: needMap[controller.controller_id] || []
  }));
}

// fetch needs from the given medical conditions
async function getNeedsForConditions(conditionNames = []) {
  if (!conditionNames.length) return [];

  const placeholders = conditionNames.map(() => '?').join(',');

  const sql = `
    SELECT 
      c.condition_name,
      fn.need_name,
      CASE 
        WHEN cn.importance_level = 'critical' THEN 3
        WHEN cn.importance_level = 'recommended' THEN 2
        WHEN cn.importance_level = 'optional' THEN 1
        ELSE 1
      END AS importanceWeight
    FROM conditions c
    JOIN condition_needs cn ON c.condition_id = cn.condition_id
    JOIN functional_needs fn ON cn.need_id = fn.need_id
    WHERE c.condition_name IN (${placeholders})
  `;

  return await query(sql, conditionNames);
}

module.exports = {
  findFilteredControllers,
  enrichControllers,
  getNeedsForConditions
};