const isHosted = window.location.hostname.includes("netlify.app");
const basePath = isHosted ? '/components/' : '../components/';
const loginPath = isHosted ? '/index.html' : '../index.html';

// Create a navigation history tracker
let appNavHistory = [];
try {
  const savedHistory = sessionStorage.getItem('appNavHistory');
  if (savedHistory) {
    appNavHistory = JSON.parse(savedHistory);
  }
} catch (e) {
  console.error("Error loading navigation history:", e);
}

// Record current page to history
const currentPage = window.location.pathname;
if (appNavHistory.length === 0 || appNavHistory[appNavHistory.length - 1] !== currentPage) {
  appNavHistory.push(currentPage);
  // Keep history manageable
  if (appNavHistory.length > 20) {
    appNavHistory.shift();
  }
  // Save history
  try {
    sessionStorage.setItem('appNavHistory', JSON.stringify(appNavHistory));
  } catch (e) {
    console.error("Error saving navigation history:", e);
  }
}

// Only block back navigation after logout, not during normal use
window.onpopstate = function(event) {
  // Check if user has logged out
  if (sessionStorage.getItem('hasLoggedOut') === 'true') {
    // If logged out, redirect to login
    if (document.body) {
      document.body.innerHTML = '';
      document.body.style.display = 'none';
    }
    window.location.replace(loginPath);
    return;
  }
};

// Wait for document to be ready before accessing elements
document.addEventListener('DOMContentLoaded', function() {
  // Hide the body until auth is verified
  if (document.body) {
    document.body.style.display = "none";
  }

  firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
      // Clear any cached pages by using replace instead of href
      window.location.replace(loginPath);
    } else if (document.body) {
      document.body.style.display = "block";
    }
  });

  // Load Header and Footer
  loadSharedUI();
});

// Load Header and Footer
function loadSharedUI() {
  const headerContainer = document.getElementById('header-container');
  const footerContainer = document.getElementById('footer-container');

  if (headerContainer) {
    fetch(basePath + 'header.html')
      .then(res => res.text())
      .then(data => {
        headerContainer.innerHTML = data;
      })
      .then(() => {
        // Load the header.js script to handle functionality
        const headerScript = document.createElement('script');
        headerScript.src = '../js/header.js';
        document.body.appendChild(headerScript);
      });
  }

  if (footerContainer) {
    fetch(basePath + 'footer.html')
      .then(res => res.text())
      .then(data => {
        footerContainer.innerHTML = data;
      });
  }
}

function logout() {
  // Clear storage but keep logout flag
  localStorage.clear();
  sessionStorage.clear();
  sessionStorage.setItem('hasLoggedOut', 'true');
  
  // Immediately hide page content to prevent flash
  if (document.body) {
    document.body.innerHTML = '';
    document.body.style.display = 'none';
  }
  
  // History manipulation for clean logout
  window.history.replaceState({isLogout: true}, null, loginPath);
  
  // Sign out and redirect
  firebase.auth().signOut()
    .then(() => {
      window.location.replace(loginPath);
    })
    .catch(() => {
      window.location.replace(loginPath);
    });
}

/**
 * Navigate to the appropriate dashboard based on user role
 */
function goToDashboard() {
  const user = firebase.auth().currentUser;
  
  if (!user) {
    console.error("No user logged in");
    window.location.replace(loginPath);
    return;
  }

  firebase.firestore().collection("users").doc(user.uid).get()
    .then((doc) => {
      if (doc.exists) {
        const userData = doc.data();
        const role = userData.role;

        // Redirect based on role
        if (role === "player") {
          window.location.href = isHosted ? '/pages/playerDashboard.html' : '../pages/playerDashboard.html';
        } else if (role === "coach") {
          window.location.href = isHosted ? '/pages/coachDashboard.html' : '../pages/coachDashboard.html';
        } else {
          console.error("Unknown user role:", role);
          window.location.replace(loginPath);
        }
      } else {
        console.error("User document not found");
        window.location.replace(loginPath);
      }
    })
    .catch((error) => {
      console.error("Error getting user data:", error);
      window.location.replace(loginPath);
    });
}

/**
 * Navigate to account settings page
 */
function goToAccountSettings() {
  const user = firebase.auth().currentUser;
  
  if (!user) {
    console.error("No user logged in");
    window.location.replace(loginPath);
    return;
  }

  // First get the user role, then navigate
  firebase.firestore().collection("users").doc(user.uid).get()
    .then((doc) => {
      if (doc.exists) {
        const userData = doc.data();
        // Cache the full user data for faster loading
        sessionStorage.setItem('userRole', userData.role);
        sessionStorage.setItem('userData', JSON.stringify(userData));
        
        // Navigate to account settings
        window.location.href = isHosted ? '/pages/accountSetting.html' : '../pages/accountSetting.html';
      } else {
        console.error("User document not found");
        window.location.replace(loginPath);
      }
    })
    .catch((error) => {
      console.error("Error getting user data:", error);
      window.location.replace(loginPath);
    });
}

/**
 * Improved back button function that uses our navigation history
 */
function goBack() {
  try {
    // Use our custom history if available
    let navHistory = [];
    try {
      const savedHistory = sessionStorage.getItem('appNavHistory');
      if (savedHistory) {
        navHistory = JSON.parse(savedHistory);
      }
    } catch (e) {
      console.error("Error accessing history:", e);
    }
    
    if (navHistory.length > 1) {
      // Remove current page
      navHistory.pop();
      // Get previous page
      const previousPage = navHistory[navHistory.length - 1];
      
      // Update history
      sessionStorage.setItem('appNavHistory', JSON.stringify(navHistory));
      
      // Navigate to previous page
      window.location.href = previousPage;
    } else {
      // If no history, go to dashboard
      goToDashboard();
    }
  } catch (e) {
    console.error("Error in goBack:", e);
    // Fallback to dashboard
    goToDashboard();
  }
}

// Make functions available globally
window.goToDashboard = goToDashboard;
window.goToAccountSettings = goToAccountSettings;
window.goBack = goBack;
window.logout = logout;