const API_BASE_URL = 'http://localhost:3000';

// Register a new user
async function registerUser(userData) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    return data;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

// Login user
async function loginUser(credentials) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
      credentials: 'include' // ensure HttpOnly cookie (refresh token) is set
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    return data; // data.accessToken
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// Get current user info using access token
async function getCurrentUser(token) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
      credentials: 'include' // ensure cookies are sent
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to get user info');
    }

    return data;
  } catch (error) {
    console.error('Get user error:', error);
    throw error;
  }
}

// Refresh access token using HttpOnly refresh token
async function refreshAccessToken() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include' // send the HttpOnly cookie
    });

    const data = await response.json();

    if (!response.ok || !data.accessToken) {
      throw new Error(data.error || 'Failed to refresh token');
    }

    // Update access token in localStorage
    localStorage.setItem('accessToken', data.accessToken);
    return data.accessToken;
  } catch (error) {
    console.error('Refresh token error:', error);
    // Clear invalid access token
    localStorage.removeItem('accessToken');
    return null;
  }
}

// Logout user
async function logoutUser() {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include' // clears HttpOnly cookie
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    localStorage.removeItem('accessToken');
  }
}

// Export functions
export {
  registerUser,
  loginUser,
  getCurrentUser,
  refreshAccessToken,
  logoutUser
};

