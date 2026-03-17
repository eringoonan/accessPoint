const API_BASE_URL = 'http://localhost:3000';


export async function getAllFeatures() {
    try {
        const response = await fetch(`${API_BASE_URL}/features`, { // call backend features route
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch features');
        }

        return data; // array of features objects
    } catch (error) {
        console.error('features API error:', error);
        throw error;
    }
}