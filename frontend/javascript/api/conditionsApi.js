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

export async function getUserConditions() {

    const accessToken = getAccessToken();

    if (!accessToken) {
        throw new Error('NOT_LOGGED_IN');
    }

    try {
        const response = await fetch(
            `${API_BASE_URL}/conditions/get-user-conditions`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );

        if (!response.ok) {

            if (response.status === 401) {
                throw new Error('NOT_LOGGED_IN');
            }

            const error = await response.json();
            throw new Error(error.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.conditions || [];

    } catch (err) {
        console.error('Error fetching user conditions:', err);
        throw err;
    }
}


export async function addUserCondition(conditionId, severityLevel = 1) {

    const accessToken = getAccessToken();

    if (!accessToken) {
        throw new Error('NOT_LOGGED_IN');
    }

    const response = await fetch(
        `${API_BASE_URL}/conditions/add-user-conditions`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                condition_id: conditionId,
                severity_level: severityLevel
            })
        }
    );

    if (!response.ok) {

        if (response.status === 401) {
            throw new Error('NOT_LOGGED_IN');
        }

        const error = await response.json();

        if (response.status === 409) {
            throw new Error('CONDITION_ALREADY_SAVED');
        }

        throw new Error(error.error || 'Failed to save condition');
    }

    return await response.json();
}

export async function removeUserCondition(conditionId) {
    const token = localStorage.getItem('accessToken');

    if (!token) {
        throw new Error('No authentication token found');
    }

    try {
        const response = await fetch(`${API_BASE_URL}/conditions/remove/${conditionId}`, {
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
        console.error('Error removing condition:', err);
        throw err;
    }
}