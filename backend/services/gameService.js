const gameRepository = require('../repositories/gameRepository');

const SUITABILITY_SCORE = {
  excellent: 3,
  good: 2,
  basic: 1
};

async function getGames(limit, offset) {
  const games = await gameRepository.findGames(limit, offset);
  return games;
}

async function enrichGames(games) {
  if (!games || !games.length) return games;

  const gameIds = games.map(g => g.game_id);

  const platforms = await gameRepository.findPlatformsForGames(gameIds);
  const features = await gameRepository.findFeaturesForGames(gameIds);

  const platformMap = {};
  platforms.forEach(p => {
    if (!platformMap[p.game_id]) platformMap[p.game_id] = [];
    platformMap[p.game_id].push(p);
  });

  const featureMap = {};
  features.forEach(f => {
    if (!featureMap[f.game_id]) featureMap[f.game_id] = [];
    featureMap[f.game_id].push(f);
  });

  games.forEach(game => {
    game.platforms = platformMap[game.game_id] || [];
    game.features = featureMap[game.game_id] || [];
  });

  return games;
}

async function searchGames(filters) {
  const { features = [], conditions = [], genre = null, mustSupportAllFeatures = true } = filters;

  // 1. hard filter games in DB
  let games = await gameRepository.findFilteredGames(filters);

  // 2. enrich with platforms and features
  games = await enrichGames(games);

  // 3. build combined feature weight map
  const combinedFeatures = new Map();

  // add direct features
  features.forEach(sel => {
    combinedFeatures.set(sel.value, sel.level ?? 3);
  });

  // expand conditions -> functional_needs -> features
  if (conditions.length) {
    const conditionNames = conditions.map(c => c.value);

    const conditionMappings = await gameRepository.getFeaturesForConditions(conditionNames);

    conditionMappings.forEach(mapping => {
      const userCondition = conditions.find(c => c.value === mapping.condition_name);
      const severity = userCondition?.level ?? 1;
      const weight = mapping.importanceWeight * severity;

      combinedFeatures.set(
        mapping.feature_name,
        (combinedFeatures.get(mapping.feature_name) ?? 0) + weight
      );
    });
  }

  // 4. score games against combined feature map
  let scored = games.map(game => {
    let score = 0;

    combinedFeatures.forEach((weight, featureName) => {
      const gameFeature = game.features.find(
        f => f.feature_name === featureName
      );

      if (!gameFeature) return;

      const suitability =
        SUITABILITY_SCORE[gameFeature.implementation_quality?.toLowerCase()] ?? 1;

      score += weight * suitability;
    });

    return { ...game, score };
  });

  // 5. if conditions were selected, drop games with no matching features
  if (conditions.length > 0) {
    const highestScore = Math.max(...scored.map(g => g.score));

    const MIN_THRESHOLD = 0.15;
    const MAX_THRESHOLD = 0.6;

    const totalSeverity = conditions.reduce((sum, c) => sum + (c.level ?? 1), 0);
    const avgSeverity = totalSeverity / conditions.length;

    const normalizedSeverity = (avgSeverity - 1) / 4;

    const dynamicThresholdRatio =
      MIN_THRESHOLD + (MAX_THRESHOLD - MIN_THRESHOLD) * normalizedSeverity;

    const THRESHOLD = highestScore * dynamicThresholdRatio;

    scored = scored.filter(g => g.score >= THRESHOLD);
  }

  // 6. sort best -> worst
  scored.sort((a, b) => b.score - a.score);

  return scored;
}

module.exports = {
  getGames,
  enrichGames,
  searchGames
};