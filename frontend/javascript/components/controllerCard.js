// controllerCard.js

export function createControllerCard(controller, options = {}) {
    const {
        secondaryButtonText = 'Save',
        secondaryButtonClass = 'btn btn-secondary',
        onSecondaryClick = null
    } = options;

    const card = document.createElement('div');
    card.className = 'controller-card';

    const primaryPlatform = controller.getPrimaryPlatform();
    const primaryPlatformDisplay = primaryPlatform 
        ? `${primaryPlatform.name}${primaryPlatform.requires_adapter ? ' (adapter)' : ''}` 
        : '';

    const features = controller.friendlyNeeds().slice(0, 2);

    card.innerHTML = `
        <div class="controller-image">
            <img src="${controller.imageUrl}" 
                 alt="${controller.name}"
                 onerror="this.src='/assets/placeholder-controller.jpg'"> 
        </div>

        <div class="controller-content">
            <div class="controller-header">
                <h3>${controller.name}</h3>
                <span class="controller-price">${controller.formattedPrice()}</span>
            </div>

            <div class="controller-features">
                ${primaryPlatformDisplay ? `<span class="feature-tag">${primaryPlatformDisplay}</span>` : ''}
                ${features.map(f => `<span class="feature-tag">${f}</span>`).join('')}
            </div>

            <p class="controller-description">
                ${controller.description()}
            </p>

            <div class="controller-actions">
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
            window.open(controller.productUrl, '_blank');
        });

    // Secondary button (Save / Remove / etc.)
    if (onSecondaryClick) {
        card.querySelector('.secondary-btn')
            .addEventListener('click', () => onSecondaryClick(controller.id));
    }

    return card;
}