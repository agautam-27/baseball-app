firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
      // No one is logged in, redirect to login page
      window.location.href = "/index.html";
    }
  });
  
function loadSharedUI() {
    fetch('/components/header.html')
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
  
    fetch('/components/footer.html')
      .then(res => res.text())
      .then(data => {
        document.getElementById('footer-container').innerHTML = data;
      });
  }
  
  loadSharedUI();
  
  function logout() {
    firebase.auth().signOut()
      .then(() => {
        window.location.href = "/index.html";
      })
      .catch((error) => {
        console.error("Logout error:", error);
      });
  }
  