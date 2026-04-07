const controllerRepository = require('../repositories/controllerRepository');

const SUITABILITY_SCORE = {
  excellent: 4,
  good: 3,
  fair: 2,
  limited: 1
};

async function searchControllers(filters) {
  const { needs = [], conditions = [], mustSupportAll = true } = filters;

  // 1. hard filter controllers in the db
  let controllers = await controllerRepository.findFilteredControllers(filters);

  // 2. enrich with platforms and needs
  controllers = await controllerRepository.enrichControllers(controllers);

  // 3. combined needs weight map
  const combinedNeeds = new Map();

  // add direct needs
  needs.forEach(sel => {
    combinedNeeds.set(sel.value, sel.level ?? 3);
  });

  // expand conditions -> needs
  if (conditions.length) {
    const conditionNames = conditions.map(c => c.value);

    const conditionMappings =
      await controllerRepository.getNeedsForConditions(conditionNames);

    conditionMappings.forEach(mapping => {
      const userCondition = conditions.find(c => c.value === mapping.condition_name);
      const severity = userCondition?.level ?? 1;

      // weight = importance × severity
      const weight = mapping.importanceWeight * severity;

      combinedNeeds.set(
        mapping.need_name,
        (combinedNeeds.get(mapping.need_name) ?? 0) + weight
      );
    });
  }

  // 4. score controllers
  let scored = controllers.map(ctrl => {
    let score = 0;

    combinedNeeds.forEach((weight, needName) => {
      const ctrlNeed = ctrl.needs.find(n => n.name === needName);
      if (!ctrlNeed) return;

      const suitability =
        SUITABILITY_SCORE[ctrlNeed.suitability?.toLowerCase()] ?? 1;

      score += weight * suitability;
    });

    // platform bonus
    if (filters.platforms?.length) {
      filters.platforms.forEach(sel => {
        const platform = ctrl.platforms.find(p => p.name === sel.value);
        if (!platform) return;
        score += platform.requires_adapter ? 1 : 2;
      });
    }

    return { ...ctrl, score };
  });

  // 5. apply dynamic threshold (only if conditions selected)
  if (conditions.length > 0) {

    const highestScore = Math.max(...scored.map(c => c.score));

    // avoid breaking if all scores are 0
    if (highestScore > 0) {

      // min and map thresholds
      const MIN_THRESHOLD = 0.15;
      const MAX_THRESHOLD = 0.6;

      // use MAX severity 
      const maxSeverity = Math.max(...conditions.map(c => c.level ?? 1));

      // normalize 1–5 -> 0–1
      const normalizedSeverity = (maxSeverity - 1) / 4;

      // non-linear scaling (more aggressive at high severity)
      const dynamicThresholdRatio =
        MIN_THRESHOLD +
        (MAX_THRESHOLD - MIN_THRESHOLD) * Math.pow(normalizedSeverity, 1.5);

      const THRESHOLD = highestScore * dynamicThresholdRatio;

      scored = scored.filter(c => c.score >= THRESHOLD);
    }
  }

  // 6. sort best -> worst
  scored.sort((a, b) => b.score - a.score);

  return scored;
}

module.exports = { searchControllers };