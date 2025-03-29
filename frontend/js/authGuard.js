const isHosted = window.location.hostname.includes("netlify.app");
const basePath = isHosted ? '/components/' : '../components/';
const loginPath = isHosted ? '/index.html' : '../index.html';

// Prevent back button taking user to authenticated pages after logout
window.history.pushState(null, null, window.location.href);
window.onpopstate = function() {
  window.history.go(1);
};

// Hide the body until auth is verified
document.body.style.display = "none";

firebase.auth().onAuthStateChanged((user) => {
  if (!user) {
    // Clear any cached pages by using replace instead of href
    window.location.replace(loginPath);
  } else {
    document.body.style.display = "block";
  }
});

// Load Header and Footer
function loadSharedUI() {
  fetch(basePath + 'header.html')
    .then(res => res.text())
    .then(data => {
      document.getElementById('header-container').innerHTML = data;
    })
    .then(() => {
      // Load the header.js script to handle toggling
      const headerScript = document.createElement('script');
      headerScript.src = '../js/header.js';
      document.body.appendChild(headerScript);
    });

  fetch(basePath + 'footer.html')
    .then(res => res.text())
    .then(data => {
      document.getElementById('footer-container').innerHTML = data;
    });
}

loadSharedUI();

function logout() {
  // Clear session storage and local storage
  sessionStorage.clear();
  
  // Add this line to properly prevent back button issues
  window.history.pushState(null, null, loginPath);
  
  firebase.auth().signOut()
    .then(() => {
      window.location.replace(loginPath);
    })
    .catch((error) => {
      // Silent error handling for mobile experience
      window.location.replace(loginPath);
    });
}