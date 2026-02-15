// class for video games
class Game {
  constructor({ game_id, title, developer, genre_id, release_date, store_url, official_website, cover_image_url }) {
    this.id = game_id;
    this.title = title;
    this.developer = developer;
    this.genre_id = genre_id;
    this.releaseDate = release_date;
    this.storeUrl = store_url;
    this.website = official_website;
    this.image = cover_image_url;
  }

  // release date to string
  formattedReleaseDate() {
    return this.releaseDate.toLocaleDateString();
  }
}

module.exports = Game;
