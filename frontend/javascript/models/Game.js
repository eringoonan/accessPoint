class Game {
  constructor(data) {
    this.id = data.game_id;
    this.name = data.title;
    this.developer = data.developer;
    this.genre = data.genre_name || null;
    this.releaseDate = data.release_date ? new Date(data.release_date) : null;
    this.productUrl = data.official_website || data.store_url || '#';
    this.imageUrl = data.cover_image_url || '/assets/placeholder-controller.jpg';
    this.score = data.score || 0;

    // Normalize platforms and features
    this.platforms = this._normalizePlatforms(data.platforms || []);
    this.features = this._normalizeFeatures(data.features || []);
  }

  _normalizePlatforms(platforms) {
    return platforms
      .map(p => {
        if (!p) return null;
        return {
          id: p.platform_id,
          name: p.platform_name,
          manufacturer: p.manufacturer,
          type: p.platform_type,
          compatibility_notes: p.notes || null,
          requires_adapter: false
        };
      })
      .filter(Boolean);
  }

  _normalizeFeatures(features) {
    return features
      .map(f => {
        if (!f) return null;
        return {
          id: f.feature_id,
          name: f.feature_name,
          description: f.description || null,
          implementation_quality: f.implementation_quality || null,
          notes: f.notes || null
        };
      })
      .filter(Boolean);
  }

  // Use first platform in the array as primary
  getPrimaryPlatform() {
    if (!this.platforms || !this.platforms.length) return null;
    return this.platforms[0];
  }

  getPlatformNames() {
    return this.platforms.map(p => p.name);
  }

  getNativePlatforms() {
    return this.platforms.filter(p => !p.requires_adapter);
  }

  getAdapterPlatforms() {
    return this.platforms.filter(p => p.requires_adapter);
  }

  getFeatureNames() {
    return this.features.map(f => f.name);
  }

  formattedReleaseDate() {
    if (!this.releaseDate) return 'N/A';
    return this.releaseDate.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formattedPrice() {
    if (this.price === 0 || this.price === null || this.price === undefined) {
      return 'Price N/A';
    }
    return `£${this.price.toFixed(2)}`;
  }

  description() {
    return `${this.developer} game${
      this.releaseDate ? ` - Released ${this.formattedReleaseDate()}` : ''
    }`;
  }

  openProductPage() {
    if (this.productUrl && this.productUrl !== '#') {
      window.open(this.productUrl, '_blank');
    } else {
      alert('Product page not available!');
    }
  }

  debug() {
    console.log(`🎮 Game: ${this.name} by ${this.developer}`);
    console.log(`   Platforms: ${this.platforms.map(p => p.name).join(', ')}`);
    console.log(`   Features: ${this.features.map(f => f.name).join(', ')}`);
    console.log(`   Genre: ${this.genre}`);
    console.log(`   Score: ${this.score}`);
  }
}

export default Game;