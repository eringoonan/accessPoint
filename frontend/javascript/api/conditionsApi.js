const API_BASE_URL = 'http://localhost:3000';

function getAccessToken() {
  return localStorage.getItem('accessToken');
}

export async function getAllConditions() {
    try {
        const response = await fetch(`${API_BASE_URL}/conditions`, { // call backend conditions route
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch conditions');
        }

        return data; // array of conditions objects
    } catch (error) {
        console.error('Conditions API error:', error);
        throw error;
    }
}