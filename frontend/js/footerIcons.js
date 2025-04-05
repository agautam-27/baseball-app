/**
 * Handles the activation of footer icons based on current page
 * This script should be loaded after the footer is in the DOM
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Wait a bit longer to ensure all dynamic content is loaded
  setTimeout(activatePageIcons, 100);
});

function activatePageIcons() {
  console.log("Activating page icons");
  
  // Get current page path
  const currentPath = window.location.pathname.toLowerCase();
  console.log("Current path:", currentPath);
  
  // Activate dashboard icon
  if (currentPath.includes('dashboard')) {
    console.log("On dashboard page - activating home icon");
    const homeIconNormal = document.querySelector('.home-icon');
    const homeIconActive = document.querySelector('.home-icon-active');
    const homeButton = document.getElementById('home-button');
    
    if (homeIconNormal && homeIconActive) {
      homeIconNormal.style.display = 'none';
      homeIconActive.style.display = 'block';
      
      // Add active class to the button for styling the label
      if (homeButton) {
        homeButton.classList.add('active');
      }
    } else {
      console.log("Could not find home icons:", { homeIconNormal, homeIconActive });
    }
  }
  
  // Activate account settings icon
  if (currentPath.includes('accountsetting')) {
    console.log("On account settings page - activating account icon");
    const accountIconNormal = document.querySelector('.account-icon');
    const accountIconActive = document.querySelector('.account-icon-active');
    const accountButton = document.getElementById('account-button');
    
    if (accountIconNormal && accountIconActive) {
      accountIconNormal.style.display = 'none';
      accountIconActive.style.display = 'block';
      
      // Add active class to the button for styling the label
      if (accountButton) {
        accountButton.classList.add('active');
      }
    } else {
      console.log("Could not find account icons:", { accountIconNormal, accountIconActive });
    }
  }
  
  // Apply styles to remove highlight effect
  const footerButtons = document.querySelectorAll('.scoutly-footer button');
  footerButtons.forEach(button => {
    button.style.webkitTapHighlightColor = 'transparent';
    button.style.webkitTouchCallout = 'none';
    button.style.webkitUserSelect = 'none';
    button.style.userSelect = 'none';
    
    button.addEventListener('touchstart', function(e) {
      // Prevent default behavior
      this.style.backgroundColor = 'transparent';
    }, { passive: true });
    
    button.addEventListener('mousedown', function(e) {
      this.style.backgroundColor = 'transparent';
    });
  });
}