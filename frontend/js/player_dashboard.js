const isHosted = window.location.hostname.includes("netlify.app");
const basePath = isHosted ? '/components/' : '../components/';
const loginPath = isHosted ? '/index.html' : '../index.html';

function waitForFirebaseAuthReady() {
  return new Promise((resolve) => {
    const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
      unsubscribe(); // ensure this only fires once
      resolve(user); // return user once Firebase is ready
    });
  });
}

waitForFirebaseAuthReady().then((user) => {
  if (user) {
    console.log("Authenticated:", user.email);
  } else {
    console.log("No user, redirecting to login...");
    window.location.href = loginPath;
  }
});


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
      window.location.href = loginPath;
    })
    .catch((error) => {
      console.error("Logout error:", error);
    });
}
