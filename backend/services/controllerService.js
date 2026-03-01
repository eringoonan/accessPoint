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

  // add the direct needs
  needs.forEach(sel => {
    combinedNeeds.set(sel.value, sel.level ?? 3);
  });

  // expand by adding conditions to the needs (if selected)
  if (conditions.length) {
    const conditionNames = conditions.map(c => c.value);
    const conditionMappings = await controllerRepository.getNeedsForConditions(conditionNames); // run function to get the needs for conditions

    conditionMappings.forEach(mapping => {
      // multiply by user-assigned severity if provided
      const userCondition = conditions.find(c => c.value === mapping.condition_name);
      const severity = userCondition?.level ?? 1;

      // weight = importance x severity
      const weight = mapping.importanceWeight * severity;

      combinedNeeds.set(
        mapping.need_name,
        (combinedNeeds.get(mapping.need_name) ?? 0) + weight
      );
    });
  }

  // 4. score the controllers
  const scored = controllers.map(ctrl => {
    let score = 0;

    combinedNeeds.forEach((weight, needName) => {
      const ctrlNeed = ctrl.needs.find(n => n.name === needName);
      if (!ctrlNeed) return;

      const suitability = SUITABILITY_SCORE[ctrlNeed.suitability?.toLowerCase()] ?? 1;
      score += weight * suitability;
    });

    // optionally add bonus for native vs adapter platforms if needed
    if (filters.platforms?.length) {
      filters.platforms.forEach(sel => {
        const platform = ctrl.platforms.find(p => p.name === sel.value);
        if (!platform) return;
        score += platform.requires_adapter ? 1 : 2;
      });
    }

    return { ...ctrl, score };
  });

  // 5. sort descending
  scored.sort((a, b) => b.score - a.score);

  return scored;
}

module.exports = { searchControllers };