// components/gamesCard.js
export function createGamesCard(game, options = {}) {
  const {
    secondaryButtonText = 'Save',
    secondaryButtonClass = 'btn btn-secondary',
    onSecondaryClick = null,
    overridePlatform = null
  } = options;

  const card = document.createElement('div');
  card.className = 'game-card';

  // Use override platform if provided, otherwise fallback to model method
  const primaryPlatform = overridePlatform || 
    (game.getPrimaryPlatform ? game.getPrimaryPlatform() : null);

  const primaryPlatformDisplay = primaryPlatform
    ? `${primaryPlatform.name}${primaryPlatform.requires_adapter ? ' (adapter)' : ''}`
    : '';

  // Genre
  const genreDisplay = game.genre || '';

  // Raw features (limit to 2)
  const features = game.getFeatureNames
    ? game.getFeatureNames().slice(0, 2)
    : [];

  card.innerHTML = `
    <div class="game-image">
      <img src="${game.imageUrl || game.image_url}" 
           alt="${game.name || game.title}"
           onerror="this.src='/assets/placeholder-controller.jpg'"> 
    </div>

    <div class="game-content">
      <div class="game-header">
        <h3>${game.name || game.title}</h3>
        <span class="game-price">
          ${game.formattedPrice ? game.formattedPrice() : 'Price N/A'}
        </span>
      </div>

      <div class="game-features">
        ${primaryPlatformDisplay ? `<span class="feature-tag">${primaryPlatformDisplay}</span>` : ''}
        ${genreDisplay ? `<span class="feature-tag">${genreDisplay}</span>` : ''}
        ${features.map(f => `<span class="feature-tag">${f}</span>`).join('')}
      </div>

      <p class="game-description">
        ${game.description 
          ? game.description() 
          : `${game.developer || ''} ${game.genre || ''}`}
      </p>

      <div class="game-actions">
        <button class="btn btn-primary learn-more-btn">
          Learn More >
        </button>

        <button class="${secondaryButtonClass} secondary-btn">
          ${secondaryButtonText}
        </button>
      </div>
    </div>
  `;

  // Learn more button
  card.querySelector('.learn-more-btn')
    .addEventListener('click', () => {
      if (game.openProductPage) game.openProductPage();
      else if (game.product_url) window.open(game.product_url, '_blank');
    });

  // Secondary button (e.g. Save)
  if (onSecondaryClick) {
    card.querySelector('.secondary-btn')
      .addEventListener('click', () => onSecondaryClick(game.id));
  }

  return card;
}