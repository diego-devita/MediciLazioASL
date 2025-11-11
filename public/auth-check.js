/**
 * Centralized authentication check for protected pages
 * Automatically redirects to /login if not authenticated
 */

(async function checkAuth() {
  try {
    const response = await fetch('/api/user?action=me', {
      credentials: 'include'
    });

    // 401 Unauthorized - not logged in
    if (response.status === 401) {
      console.log('Not authenticated, redirecting to login');
      window.location.href = '/login';
      return null;
    }

    // 404 or other errors - session invalid or user deleted
    if (!response.ok) {
      console.log('Invalid session, redirecting to login');
      window.location.href = '/login';
      return null;
    }

    const data = await response.json();

    // Check if response has valid user data
    if (!data.success || !data.user) {
      console.log('Invalid user data, redirecting to login');
      window.location.href = '/login';
      return null;
    }

    // User is authenticated - return user data
    return data.user;

  } catch (err) {
    console.error('Error checking authentication:', err);
    // Network error or other issue - redirect to login
    window.location.href = '/login';
    return null;
  }
})();

/**
 * Check if user is admin (for admin pages)
 * Call this after including auth-check.js
 */
async function requireAdmin() {
  try {
    const response = await fetch('/api/user?action=me', {
      credentials: 'include'
    });

    if (response.status === 401) {
      window.location.href = '/login';
      return false;
    }

    if (response.status === 403 || !response.ok) {
      // Forbidden or other error
      alert('Accesso negato. Solo gli admin possono accedere a questa pagina.');
      window.location.href = '/';
      return false;
    }

    const data = await response.json();

    if (!data.success || !data.user || data.user.role !== 'admin') {
      alert('Accesso negato. Solo gli admin possono accedere a questa pagina.');
      window.location.href = '/';
      return false;
    }

    return true;

  } catch (err) {
    console.error('Error checking admin status:', err);
    window.location.href = '/login';
    return false;
  }
}

// Export for use in other scripts
window.requireAdmin = requireAdmin;
