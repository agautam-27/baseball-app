/**
 * Toggle the side menu and overlay visibility
 * Slides the menu in from the left and shows/hides the overlay
 */
function toggleMenu() {
    console.log("header.js toggleMenu called");
    const sideMenu = document.getElementById("side-menu");
    const overlay = document.getElementById("menu-overlay");

    if (!sideMenu || !overlay) {
        console.error("Menu or overlay element not found in header.js");
        return;
    }

    sideMenu.classList.toggle("active");
    overlay.classList.toggle("active");
    console.log("Menu active:", sideMenu.classList.contains("active"));
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

// Add event listeners when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
    console.log("header.js DOMContentLoaded");

    // Check if elements exist
    const hamburgerBtn = document.querySelector(".hamburger");
    const sideMenu = document.getElementById("side-menu");
    const overlay = document.getElementById("menu-overlay");

    console.log("Elements found:", {
        hamburgerBtn: !!hamburgerBtn,
        sideMenu: !!sideMenu,
        overlay: !!overlay,
    });

    // Add click event to hamburger button
    if (hamburgerBtn) {
        hamburgerBtn.addEventListener("click", function (e) {
            console.log("Hamburger clicked in header.js");
            toggleMenu();
            // Prevent default to be safe
            e.preventDefault();
        });
    }

    // Add click event to overlay
    if (overlay) {
        overlay.addEventListener("click", function () {
            console.log("Overlay clicked in header.js");
            toggleMenu();
        });
    }
});
