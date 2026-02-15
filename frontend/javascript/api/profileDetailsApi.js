const API_BASE_URL = 'http://localhost:3000';

export async function getUserDetails(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/profileDetails/${id}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.controllers || [];
    } catch (err) {
        console.error('Error fetching user details:', err);
        throw err;
    }
}

export async function removeUserController(controllerId) {
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
        throw new Error('No authentication token found');
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/profileDetails/remove/${controllerId}`, {
            method: 'DELETE',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (err) {
        console.error('Error removing controller:', err);
        throw err;
    }
}