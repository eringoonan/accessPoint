const API_BASE_URL = 'http://localhost:3000';

function getAccessToken() {
  return localStorage.getItem('accessToken');
}

// returns games from db
export async function getGames(){
    try {
        const response = await fetch(`${API_BASE_URL}/games`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch games');
        }

        return data;
    } catch (error){
        console.error('games API error:', error);
        throw error;
    }
}

// enrich an array of games
export async function enrichGames(games) {
    try {
        const response = await fetch(`${API_BASE_URL}/games/enrich`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' 
            },
            body: JSON.stringify(games)
        });
        const data = await response.json();

        if (!response.ok) {
        throw new Error(data.error || 'Failed to enrich games');
        }

        return data;
    } catch (error ) {
        console.error('games API error:', error);
        throw error;
    }

}