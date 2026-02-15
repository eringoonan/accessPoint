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
    this.price = parseFloat(price) || 0;
    this.releaseDate = release_date ? new Date(release_date) : null;
    this.productUrl = product_url || '#';
    this.imageUrl = image_url || '/assets/placeholder-controller.jpg';

    // from junction table
    this.platforms = Array.isArray(platforms) ? platforms : [];
    this.needs = Array.isArray(needs) ? needs : [];
  }


  // Format release date nicely
  formattedReleaseDate() {
    if (!this.releaseDate) return 'N/A';
    return this.releaseDate.toLocaleDateString('en-GB', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  // Format price nicely
  formattedPrice() {
    return `£${this.price.toFixed(2)}`;
  }

  friendlyNeeds() {
    return this.needs.map(
      n => FEATURE_MAP[n] || n
    );
  }

  // Return a short description 
  description() {
    return `${this.manufacturer} ${this.type} controller${this.releaseDate ? ` - Released ${this.formattedReleaseDate()}` : ''}`;
  }

  // Quick way to open product page
  openProductPage() {
    if (this.productUrl && this.productUrl !== '#') {
      window.open(this.productUrl, '_blank');
    } else {
      alert('Product page not available!');
    }
  }

  // debug method
  debug() {
    console.log(`🕹️ Controller: ${this.name} by ${this.manufacturer}, £${this.price}`);
  }
}

export default Controller;
