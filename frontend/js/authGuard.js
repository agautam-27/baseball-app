const isHosted = window.location.hostname.includes("netlify.app");
const basePath = isHosted ? '/components/' : '../components/';
const loginPath = isHosted ? '/index.html' : '../index.html';

// Hide body by default until auth check passes
// document.body.style.display = "none";

firebase.auth().onAuthStateChanged((user) => {
  if (!user) {
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
      window.toggleMenu = () => {
        const menu = document.getElementById('side-menu');
        menu.classList.toggle('hidden');
      };
    });

  fetch(basePath + 'footer.html')
    .then(res => res.text())
    .then(data => {
      document.getElementById('footer-container').innerHTML = data;
    });
}

loadSharedUI();

function logout() {
  firebase.auth().signOut()
    .then(() => {
      window.location.replace(loginPath);
    })
    .catch((error) => {
      console.error("Logout error:", error);
    });
}
