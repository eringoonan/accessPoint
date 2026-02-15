import { FEATURE_MAP } from '../components/featureMapper.js';

// models/Controller.js
class Controller {
  constructor({ 
    controller_id, 
    controller_name, 
    manufacturer, 
    controller_type, 
    price, 
    release_date, 
    product_url, 
    image_url,
    platforms,
    needs
  }) {
    this.id = controller_id;
    this.name = controller_name;
    this.manufacturer = manufacturer;
    this.type = controller_type;
    
    // check price is a number
    this.price = price !== null && price !== undefined ? parseFloat(price) : 0;
    
    this.releaseDate = release_date ? new Date(release_date) : null;
    this.productUrl = product_url || '#';
    this.imageUrl = image_url || '/assets/placeholder-controller.jpg';

    // normalise platforms and needs
    this.platforms = this._normalizePlatforms(platforms);
    this.needs = this._normalizeNeeds(needs);
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
  _normalizeNeeds(needs) {
    if (!Array.isArray(needs)) return [];
    
    return needs.map(n => {
      // if already an object return
      if (typeof n === 'object' && n.name) {
        return n;
      }
      // if string convert to object with proper attributes
      if (typeof n === 'string') {
        return {
          name: n,
          suitability: null
        };
      }
      return null;
    }).filter(n => n !== null);
  }

  // get array of platform names
  getPlatformNames() {
    return this.platforms.map(p => p.name);
  }

  // get primary platform (first inserted)
  // TO DO: ADD VARIABLE CALLED PRIMARY PLATFORM TO THE DB
  getPrimaryPlatform() {
    if (this.platforms.length === 0) return null;
    // return last platform in array
    return this.platforms[this.platforms.length - 1];
  }

  // filter platforms that only have native support
  getNativePlatforms() {
    return this.platforms.filter(p => !p.requires_adapter);
  }

  // filter platforms that require adapter support
  getAdapterPlatforms() {
    return this.platforms.filter(p => p.requires_adapter);
  }

  // array of need names
  getNeedNames() {
    return this.needs.map(n => n.name);
  }

  // return needs by suitability level
  getNeedsBySuitability(suitability) {
    return this.needs.filter(n => 
      n.suitability && n.suitability.toLowerCase() === suitability.toLowerCase()
    );
  }

  // map needs to friendly names using feature map
  friendlyNeeds() {
    return this.needs
      .filter(n => n.name && n.name.trim()) // Remove empty/null needs
      .map(n => FEATURE_MAP[n.name] || n.name); // Map to friendly name
  }

  // friendly needs mapped, with suitability info too
  friendlyNeedsWithSuitability() {
    return this.needs
      .filter(n => n.name && n.name.trim())
      .map(n => ({
        friendly: FEATURE_MAP[n.name] || n.name,
        suitability: n.suitability
      }));
  }

  // format date
  formattedReleaseDate() {
    if (!this.releaseDate) return 'N/A';
    return this.releaseDate.toLocaleDateString('en-GB', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  // format price
  formattedPrice() {
    if (this.price === 0 || this.price === null) {
      return 'Price N/A';
    }
    return `£${this.price.toFixed(2)}`;
  }

  // create description
  description() {
    return `${this.manufacturer} ${this.type} controller${this.releaseDate ? ` - Released ${this.formattedReleaseDate()}` : ''}`;
  }

  // Qunction to open product page
  openProductPage() {
    if (this.productUrl && this.productUrl !== '#') {
      window.open(this.productUrl, '_blank');
    } else {
      alert('Product page not available!');
    }
  }

  // debugging function
  debug() {
    console.log(`   Controller: ${this.name} by ${this.manufacturer}, £${this.price}`);
    console.log(`   Platforms (${this.platforms.length}):`);
    this.platforms.forEach(p => {
      console.log(`     - ${p.name} ${p.requires_adapter ? '(requires adapter)' : '(native)'} - ${p.compatibility_notes || 'no notes'}`);
    });
    console.log(`   Primary Platform: ${this.getPrimaryPlatform()?.name || 'None'}`);
    console.log(`   Needs (${this.needs.length}):`);
    this.needs.forEach(n => {
      console.log(`     - ${n.name} ${n.suitability ? `(${n.suitability})` : '(no suitability)'}`);
    });
    console.log(`   Friendly Needs: ${this.friendlyNeeds().join(', ')}`);
  }
}

export default Controller;