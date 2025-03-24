/**
 * Toggle the side menu and overlay visibility
 * Slides the menu in from the left and shows/hides the overlay
 */
function toggleMenu() {
    console.log("toggleMenu called");
    const sideMenu = document.getElementById("side-menu");
    const overlay = document.getElementById("menu-overlay");

    if (!sideMenu || !overlay) {
        console.error("Menu or overlay element not found");
        return;
    }

    // Toggle active class to show/hide menu and overlay
    sideMenu.classList.toggle("active");
    overlay.classList.toggle("active");
    
    // For accessibility
    if (sideMenu.classList.contains("active")) {
        document.body.style.overflow = "hidden"; // Prevent scrolling when menu is open
    } else {
        document.body.style.overflow = ""; // Allow scrolling when menu is closed
    }
}

/**
 * Logout function - redirects to the login page
 */
function logout() {
    console.log("Logout called");
    if (typeof firebase !== "undefined" && firebase.auth) {
        firebase
            .auth()
            .signOut()
            .then(() => {
                window.location.href = "../index.html";
            })
            .catch((error) => {
                console.error("Logout error:", error);
            });
    } else {
        // Fallback for testing
        window.location.href = "../index.html";
    }
}

// Initialize the header UI
function initHeader() {
    console.log("Initializing header");
    const hamburgerBtn = document.getElementById("hamburger-btn");
    const overlay = document.getElementById("menu-overlay");
    
    if (hamburgerBtn) {
        // Remove any existing event listeners
        hamburgerBtn.removeEventListener("click", toggleMenu);
        // Add new click event
        hamburgerBtn.addEventListener("click", function(e) {
            console.log("Hamburger button clicked");
            toggleMenu();
            e.preventDefault();
        });
    } else {
        console.error("Hamburger button not found");
    }
    
    if (overlay) {
        // Remove any existing event listeners
        overlay.removeEventListener("click", toggleMenu);
        // Add new click event to close menu when overlay is clicked
        overlay.addEventListener("click", function() {
            console.log("Overlay clicked");
            toggleMenu();
        });
    } else {
        console.error("Overlay not found");
    }
}

// Initialize header when script is loaded
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHeader);
} else {
    // If DOMContentLoaded has already fired
    initHeader();
}

// Make sure toggleMenu is available globally
window.toggleMenu = toggleMenu;
window.logout = logout;
