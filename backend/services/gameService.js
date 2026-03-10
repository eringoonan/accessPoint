const gameRepository = require('../repositories/gameRepository');

const SUITABILITY_SCORE = {
  excellent: 3,
  good: 2,
  basic: 1
};

async function getGames() {
  const games = await gameRepository.findGames();

  return games;
}

// function to enrich existing games with their information
async function enrichGames(games) {

  if (!games || !games.length) return games;

  const gameIds = games.map(g => g.game_id);

  const platforms = await gameRepository.findPlatformsForGames(gameIds);
  const features = await gameRepository.findFeaturesForGames(gameIds);

  // platform map
  const platformMap = {};
  platforms.forEach(p => {
    if (!platformMap[p.game_id]) platformMap[p.game_id] = [];
    platformMap[p.game_id].push(p);
  });

  // feature map
  const featureMap = {};
  features.forEach(f => {
    if (!featureMap[f.game_id]) featureMap[f.game_id] = [];
    featureMap[f.game_id].push(f);
  });

  // attach
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

  // 2. enrich with features
  games = await enrichGames(games);

  // 3. combined features weight map
  const combinedFeatures = new Map();

  // add direct features
  features.forEach(sel => {
    combinedFeatures.set(sel.value, sel.level ?? 3);
  });

  // expand via conditions → needs → features
  if (conditions.length) {
    const conditionNames = conditions.map(c => c.value);

    const conditionMappings =
      await gameRepository.getFeaturesForConditions(conditionNames);

    conditionMappings.forEach(mapping => {

      const userCondition = conditions.find(
        c => c.value === mapping.condition_name
      );

      const severity = userCondition?.level ?? 1;

      const weight = mapping.importanceWeight * severity;

      combinedFeatures.set(
        mapping.feature_name,
        (combinedFeatures.get(mapping.feature_name) ?? 0) + weight
      );
    });
  }

  // 4. score games
  const scored = games.map(game => {

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

  // 5. sort best → worst
  scored.sort((a, b) => b.score - a.score);

  return scored;
}

module.exports = {
  getGames,
  enrichGames,
  searchGames
};