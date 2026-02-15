// api/controllersApi.js
const API_BASE_URL = 'http://localhost:3000';

// get access token from local storage
function getAccessToken() {
  return localStorage.getItem('accessToken');
}

// return all controllers from DB
export async function getAllControllers() {
    try {
        const response = await fetch(`${API_BASE_URL}/controllers`, { // call backend controllers route
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch controllers');
        }

        return data; // array of controller objects
    } catch (error) {
        console.error('Controllers API error:', error);
        throw error;
    }
}

// save controller to user controller table
export async function saveUserController(controllerId) {
  
  // verify user access token
  const accessToken = getAccessToken();  
  if (!accessToken) {
    throw new Error('NOT_LOGGED_IN');
  }

  // query base API for the user controllers with controller id
  const url = `${API_BASE_URL}/controllers/user-controllers`;
  const payload = { controller_id: controllerId };


  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });

    if (!response.ok) {
    const error = await response.json();

    if (response.status === 401) {
        throw new Error('NOT_LOGGED_IN');
    }

    throw new Error(error.error || 'Failed to save controller');
    }
  
  const result = await response.json();
  return result;
}

// admin function to create new controller
export async function createController(controllerData) {
  try {
    const accessToken = getAccessToken();
    
    if (!accessToken) {
      throw new Error('No authentication token found. Please log in.');
    }

    const response = await fetch(`${API_BASE_URL}/controllers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(controllerData)
    });

    if (!response.ok) {
      // Handle specific error cases
      if (response.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      }
      if (response.status === 403) {
        throw new Error('Admin access required. You do not have permission to perform this action.');
      }
      
      const errorData = await response.json();
      throw new Error(errorData.error || errorData.message || 'Failed to create controller');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating controller:', error);
    throw error;
  }
}