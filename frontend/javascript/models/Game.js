// game class

class Game {
    constructor({
        game_id,
        title,
        developer,
        genre,
        release_date,
        product_url,
        image_url,
        primary_platform,
        platforms,
        features,
    }) {
        this.id = game_id;
        this.title = title;
        this.developer = developer;
        this.genre = genre;

        this.releaseDate = release_date ? new Date(release_date) : null;

        this.product_url = product_url || '#';;
        this.image_url = image_url || '/assets/placeholder-controller.jpg';

        this.primary_platform = primary_platform;
        this.platforms = this._normalizePlatforms(platforms);
        this.features = this._normalizeFeatures(features);
    }

      //turn platforms into objects
  _normalizePlatforms(platforms) {
    if (!Array.isArray(platforms)) return [];
    
    return platforms.map(p => {
      // if already an object return
      if (typeof p === 'object' && p.name) {
        return p;
      }
      // if string convert to object with proper attributes
      if (typeof p === 'string') {
        return {
          name: p,
          compatibility_notes: null,
          requires_adapter: false
        };
      }
      return null;
    }).filter(p => p !== null);
  }

  // turn needs into objects
  _normalizeFeatures(features) {
    if (!Array.isArray(features)) return [];
    
    return features.map(f => {
      // if already an object return
      if (typeof f === 'object' && f.name) {
        return f;
      }
      // if string convert to object with proper attributes
      if (typeof f === 'string') {
        return {
          name: f,
          suitability: null
        };
      }
      return null;
    }).filter(f => f !== null);
  }
}