const db = firebase.firestore();

const roleSelect = document.getElementById('role-select');
const formContainer = document.getElementById('form-container');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const authMessage = document.getElementById('auth-message');

let selectedRole = null;

// Role selection
document.querySelectorAll('.role-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedRole = btn.dataset.role;
      roleSelect.style.display = 'none';
      formContainer.style.display = 'block';
  
      // Always default to login first when a role is selected
      signupForm.style.display = "none";
      loginForm.style.display = "block";
  
      // Hide Coach ID on login screen
      document.getElementById('coach-id-wrapper').style.display = "none";
    });
  });
  
  

  document.getElementById('show-signup').addEventListener('click', () => {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'block';
  
    // Show coach ID only if role is coach
    if (selectedRole === 'coach') {
      document.getElementById('coach-id-wrapper').style.display = 'block';
    } else {
      document.getElementById('coach-id-wrapper').style.display = 'none';
    }
  });
  
  document.getElementById('show-login').addEventListener('click', () => {
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('coach-id-wrapper').style.display = 'none'; // optional
  });
  

// ✅ Sign Up
signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
  
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const coachId = document.getElementById('coach-id').value.trim();
  
    if (!selectedRole) {
        authMessage.textContent = "❌ Please select a role first!";
        return;
      }
    
      // ✅ Put the check here!
      if (selectedRole === 'coach' && coachId === "") {
        authMessage.textContent = "❌ Coach ID is required to sign up as a coach.";
        return;
      }
  
      const validateCoachId = selectedRole === 'coach'
      ? (coachId === "COACH2025"
          ? Promise.resolve() // Always allow this one
          : db.collection("coach_invites").doc(coachId).get().then(doc => {
              if (!doc.exists) {
                throw new Error("Invalid Coach ID");
              }
              if (doc.data().used) {
                throw new Error("Coach ID already used");
              }
            })
        )
      : Promise.resolve(); // For players
    
    validateCoachId
      .then(() => firebase.auth().createUserWithEmailAndPassword(email, password))
      .then((userCredential) => {
        const user = userCredential.user;
  
        const userDoc = {
          name: name,
          email: email,
          role: selectedRole
        };
  
        const batch = db.batch();
  
        // Store user profile
        const userRef = db.collection("users").doc(user.uid);
        batch.set(userRef, userDoc);
  
        // If coach, mark ID as used
        if (selectedRole === 'coach') {
          const coachRef = db.collection("coach_invites").doc(coachId);
          batch.update(coachRef, {
            used: true,
            assignedTo: email
          });
        }
  
        return batch.commit();
      })
      .then(() => {
        authMessage.textContent = `✅ Signed up successfully as ${selectedRole}`;
        signupForm.reset();
      
        setTimeout(() => {
          authMessage.textContent = "";
      
          // Swap views
          signupForm.style.display = "none";
          loginForm.style.display = "block";
      
          // Ensure role stays selected and login screen is clean
          formContainer.style.display = "block";
          roleSelect.style.display = "none";
      
          // Hide coach ID on login view
          document.getElementById('coach-id-wrapper').style.display = "none";
        }, 1500);
      })
      
      .catch((error) => {
        authMessage.textContent = `❌ ${error.message}`;
      });
  });
  
// ✅ Login
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  if (!selectedRole) {
    authMessage.textContent = "❌ Please select a role first!";
    return;
  }

  firebase.auth().signInWithEmailAndPassword(email, password)
  .then((userCredential) => {
    const user = userCredential.user;

    // Fetch user role from Firestore
    return db.collection("users").doc(user.uid).get();
  })
  .then((doc) => {
    if (doc.exists) {
      const userData = doc.data();

      if (userData.role !== selectedRole) {
        authMessage.textContent = `❌ Role mismatch. This account is registered as ${userData.role}.`;
        firebase.auth().signOut();
      } else {
        loginForm.reset();

        // ✅ Redirect based on role
        if (userData.role === 'coach') {
          window.location.href = "pages/coach_dashboard.html";
        } else {
          window.location.href = "pages/player_dashboard.html";
        }
      }
    } else {
      authMessage.textContent = "❌ User data not found.";
    }
  })
    .catch((error) => {
      authMessage.textContent = `❌ ${error.message}`;
    });
});

document.querySelectorAll('.back-to-role').forEach(btn => {
  btn.addEventListener('click', () => {
    signupForm.style.display = 'none';
    loginForm.style.display = 'none';
    formContainer.style.display = 'none';
    roleSelect.style.display = 'block';
    selectedRole = null;
  });
});
