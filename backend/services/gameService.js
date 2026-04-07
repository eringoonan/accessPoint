const gameRepository = require('../repositories/gameRepository');

const IMPORTANCE_TO_MIN_QUALITY = {
  1: 1,
  2: 1,
  3: 2,
  4: 3,
  5: 3
};

const QUALITY_RANK = {
  basic: 1,
  good: 2,
  excellent: 3
};

async function getGames(limit, offset) {
  return await gameRepository.findGames(limit, offset);
}

async function enrichGames(games) {
  if (!games?.length) return games;

  const gameIds = games.map(g => g.game_id);

  const platforms = await gameRepository.findPlatformsForGames(gameIds);
  const features = await gameRepository.findFeaturesForGames(gameIds);

  const platformMap = {};
  const featureMap = {};

  platforms.forEach(p => {
    if (!platformMap[p.game_id]) platformMap[p.game_id] = [];
    platformMap[p.game_id].push(p);
  });

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
  const {
    features = [],
    conditions = [],
    genre = null,
    mustSupportAllFeatures = true
  } = filters;

  // 1. DB filter 
  let games = await gameRepository.findFilteredGames({
    ...filters,
    features: []
  });

  // 2. enrich
  games = await enrichGames(games);

  // 3. build combined feature map
  const combinedFeatures = new Map();
  const conditionFeatureSet = new Set();

  // direct features
  features.forEach(sel => {
    const importance = sel.level ?? 3;
    const minQualityRank = IMPORTANCE_TO_MIN_QUALITY[importance] ?? 1;

    combinedFeatures.set(sel.value, {
      weight: importance,
      minQualityRank,
      isDirect: true
    });
  });

  // map conditions to features
  if (conditions.length) {
    const conditionNames = conditions.map(c => c.value);

    const conditionMappings =
      await gameRepository.getFeaturesForConditions(conditionNames);

    conditionMappings.forEach(mapping => {
      const userCondition = conditions.find(c => c.value === mapping.condition_name);
      const severity = userCondition?.level ?? 1;

      const weight = mapping.importanceWeight * severity;

      const existing = combinedFeatures.get(mapping.feature_name);

      combinedFeatures.set(mapping.feature_name, {
        weight: (existing?.weight ?? 0) + weight,
        minQualityRank: existing?.minQualityRank ?? 1,
        isDirect: existing?.isDirect ?? false
      });

      conditionFeatureSet.add(mapping.feature_name);
    });
  }

  // 4. scoring + HARD FILTERING
  let scored = games.map(game => {

    let score = 0;

    let matchedDirectFeatures = 0;
    const totalDirectFeatures = features.length;

    let matchedConditionFeatures = 0;
    const totalConditionFeatures = conditionFeatureSet.size;

    combinedFeatures.forEach(({ weight, minQualityRank, isDirect }, featureName) => {

      const gameFeature = game.features.find(
        f => f.feature_name === featureName
      );

      if (!gameFeature) return;

      const qualityRank =
        QUALITY_RANK[gameFeature.implementation_quality?.toLowerCase()] ?? 1;

      // remove if below quality threshold
      if (qualityRank < minQualityRank) return;

      if (isDirect) matchedDirectFeatures++;

      if (conditionFeatureSet.has(featureName)) {
        matchedConditionFeatures++;
      }

      score += weight * qualityRank;
    });

    // hard filter - direct feature logic
    if (features.length > 0) {
      if (mustSupportAllFeatures) {
        if (matchedDirectFeatures < totalDirectFeatures) return null;
      } else {
        if (matchedDirectFeatures === 0) return null;
      }
    }

    // hard filter - condition logic takes precedence 
    if (conditions.length > 0 && totalConditionFeatures > 0) {

      const matchRatio = matchedConditionFeatures / totalConditionFeatures;

      const totalSeverity = conditions.reduce(
        (sum, c) => sum + (c.level ?? 1), 0
      );

      const avgSeverity = totalSeverity / conditions.length;
      const normalizedSeverity = (avgSeverity - 1) / 4;

      const MIN_MATCH = 0.3;
      const MAX_MATCH = 0.8;

      const requiredMatch =
        MIN_MATCH + (MAX_MATCH - MIN_MATCH) * normalizedSeverity;

      if (matchRatio < requiredMatch) return null;
    }

    return { ...game, score };

  }).filter(Boolean);

  // 5. dynamic threshold (secondary filter)
  if (conditions.length > 0 && scored.length > 0) {

    const highestScore = Math.max(...scored.map(g => g.score));

    if (highestScore > 0) {

      const totalSeverity = conditions.reduce(
        (sum, c) => sum + (c.level ?? 1), 0
      );

      const avgSeverity = totalSeverity / conditions.length;
      const normalizedSeverity = (avgSeverity - 1) / 4;

      const MIN_THRESHOLD = 0.15;
      const MAX_THRESHOLD = 0.6;

      const dynamicThresholdRatio =
        MIN_THRESHOLD + (MAX_THRESHOLD - MIN_THRESHOLD) * normalizedSeverity;

      const THRESHOLD = highestScore * dynamicThresholdRatio;

      scored = scored.filter(
        g => g.score > 0 && g.score >= THRESHOLD
      );
    }
  }

  // 6. sort
  scored.sort((a, b) => b.score - a.score);

  return scored;
}

module.exports = {
  getGames,
  enrichGames,
  searchGames
};