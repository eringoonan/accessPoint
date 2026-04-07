const API_BASE_URL = 'http://localhost:3000';

function getAccessToken() {
  return localStorage.getItem('accessToken');
}

// used for controllers page (returns conditions with functional needs)
export async function getAllConditions() {
    try {
        const response = await fetch(`${API_BASE_URL}/conditions`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch conditions');
        }

        return data;
    } catch (error) {
        console.error('Conditions API error:', error);
        throw error;
    }
}

// used for games page (returns conditions with resolved accessibility feature names)
export async function getConditionsWithFeatures() {
    try {
        const response = await fetch(`${API_BASE_URL}/conditions/with-features`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch conditions with features');
        }

        return data;
    } catch (error) {
        console.error('Conditions API error:', error);
        throw error;
    }
}