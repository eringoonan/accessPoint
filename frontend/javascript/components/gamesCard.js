// gamesCard.js
export function createGamesCard(game, options = {}) {
    const {
        secondaryButtonText = 'Save',
        secondaryButtonClass = 'btn btn-secondary',
        onSecondaryClick = null
    } = options;

    const card = document.createElement('div');
    card.className = 'game-card';

    const primaryPlatform = game.getPrimaryPlatform();
    const primaryPlatformDisplay = primaryPlatform 
        ? `${primaryPlatform.name}${primaryPlatform.requires_adapter ? ' (adapter)' : ''}` 
        : '';

    const features = game.friendlyNeeds().slice(0, 2);

    card.innerHTML = `
        <div class="game-image">
            <img src="${game.imageUrl}" 
                 alt="${game.name}"
                 onerror="this.src='/assets/placeholder-controller.jpg'"> 
        </div>

        <div class="game-content">
            <div class="game-header">
                <h3>${game.name}</h3>
                <span class="game-price">${game.formattedPrice()}</span>
            </div>

            <div class="game-features">
                ${primaryPlatformDisplay ? `<span class="feature-tag">${primaryPlatformDisplay}</span>` : ''}
                ${features.map(f => `<span class="feature-tag">${f}</span>`).join('')}
            </div>

            <p class="game-description">
                ${game.description()}
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

    // Learn More button
    card.querySelector('.learn-more-btn')
        .addEventListener('click', () => {
            window.open(game.productUrl, '_blank');
        });

    // Secondary button (Save / Remove / etc.)
    if (onSecondaryClick) {
        card.querySelector('.secondary-btn')
            .addEventListener('click', () => onSecondaryClick(game.id));
    }

    return card;
}