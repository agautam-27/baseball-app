const db = firebase.firestore();

const roleSelect = document.getElementById('role-select');
const formContainer = document.getElementById('form-container');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const authMessage = document.getElementById('auth-message');

let selectedRole = null;

const firebaseErrorMessages = {
  "auth/invalid-email": "Invalid email format. Please try again.",
  "auth/user-disabled": "This user account has been disabled.",
  "auth/user-not-found": "No user found with that email. Please check or sign up.",
  "auth/wrong-password": "Incorrect password. Please try again.",
  "auth/email-already-in-use": "This email is already registered. Please log in or use another email."
};

const messages = {
  selectRole: "❌ Please select a role first!",
  coachIdRequired: "❌ Coach ID is required to sign up as a coach.",
  invalidCoachId: "❌ Invalid Coach ID.",
  coachIdUsed: "❌ Coach ID already used.",
  userDataNotFound: "❌ User data not found.",
  roleMismatch: (actualRole) => `❌ Role mismatch. This account is registered as ${actualRole}.`,
  signupSuccess: (role) => `✅ Signed up successfully as ${role}`,
  invalidCredentials: "❌ Invalid email or password. Please try again.",
  unknownError: "❌ An unknown error occurred.",
};

function getErrorMessage(error) {
  if (error && typeof error === 'object') {
    if (firebaseErrorMessages[error.code]) {
      return firebaseErrorMessages[error.code];
    }

    if (typeof error.message === 'string') {
      try {
        const parsed = JSON.parse(error.message);
        if (parsed && parsed.error && parsed.error.message) {
          return firebaseErrorMessages[parsed.error.message] || messages.invalidCredentials;
        }
      } catch (e) {
        return error.message;
      }
    }

    if (error.error && typeof error.error.message === 'string') {
      return firebaseErrorMessages[error.error.message] || messages.invalidCredentials;
    }
  }

  return messages.unknownError;
}


document.querySelectorAll('.role-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedRole = btn.dataset.role;
    roleSelect.style.display = 'none';
    formContainer.style.display = 'block';

    signupForm.style.display = "none";
    loginForm.style.display = "block";
    document.getElementById('coach-id-wrapper').style.display = "none";
  });
});


document.getElementById('show-signup').addEventListener('click', () => {
  loginForm.reset();
  authMessage.textContent = "";

  loginForm.style.display = 'none';
  signupForm.style.display = 'block';

  document.getElementById('coach-id-wrapper').style.display = (selectedRole === 'coach') ? 'block' : 'none';
});

// 🔄 Switch to login
document.getElementById('show-login').addEventListener('click', () => {
  signupForm.reset();
  authMessage.textContent = "";

  signupForm.style.display = 'none';
  loginForm.style.display = 'block';
  document.getElementById('coach-id-wrapper').style.display = 'none';
});


signupForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const name = document.getElementById('signup-name').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const coachId = document.getElementById('coach-id').value.trim();

  if (!selectedRole) {
    authMessage.textContent = messages.selectRole;
    return;
  }

  if (selectedRole === 'coach' && coachId === "") {
    authMessage.textContent = messages.coachIdRequired;
    return;
  }

  const validateCoachId = selectedRole === 'coach'
    ? (coachId === "COACH2025"
        ? Promise.resolve()
        : db.collection("coach_invites").doc(coachId).get().then(doc => {
            if (!doc.exists) throw new Error(messages.invalidCoachId);
            if (doc.data().used) throw new Error(messages.coachIdUsed);
          })
      )
    : Promise.resolve();

  validateCoachId
    .then(() => firebase.auth().createUserWithEmailAndPassword(email, password))
    .then((userCredential) => {
      const user = userCredential.user;

      const userDoc = {
        name,
        email,
        role: selectedRole
      };

      const batch = db.batch();
      batch.set(db.collection("users").doc(user.uid), userDoc);

      if (selectedRole === 'coach') {
        const coachRef = db.collection("coach_invites").doc(coachId);
        batch.update(coachRef, { used: true, assignedTo: email });
      }

      return batch.commit();
    })
    .then(() => {
      authMessage.textContent = messages.signupSuccess(selectedRole);
      signupForm.reset();

      setTimeout(() => {
        authMessage.textContent = "";
        signupForm.style.display = "none";
        loginForm.style.display = "block";
        formContainer.style.display = "block";
        roleSelect.style.display = "none";
        document.getElementById('coach-id-wrapper').style.display = "none";
      }, 1500);
    })
    .catch((error) => {
      const message = getErrorMessage(error);
      authMessage.textContent = message;
    });
});


loginForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  if (!selectedRole) {
    authMessage.textContent = messages.selectRole;
    return;
  }

  firebase.auth().signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      return db.collection("users").doc(user.uid).get();
    })
    .then((doc) => {
      if (doc.exists) {
        const userData = doc.data();

        if (userData.role !== selectedRole) {
          authMessage.textContent = messages.roleMismatch(userData.role);
          firebase.auth().signOut();
        } else {
          loginForm.reset();

          if (userData.role === 'coach') {
            window.location.href = "pages/coachDashboard.html";
          } else {
            window.location.href = "pages/playerDashboard.html";
          }
        }
      } else {
        authMessage.textContent = messages.userDataNotFound;
      }
    })
    .catch((error) => {
      const message = getErrorMessage(error);
      authMessage.textContent = message;
    });
});


document.querySelectorAll('.back-to-role').forEach(btn => {
  btn.addEventListener('click', () => {
    signupForm.reset();
    loginForm.reset();
    authMessage.textContent = "";

    signupForm.style.display = 'none';
    loginForm.style.display = 'none';
    formContainer.style.display = 'none';
    roleSelect.style.display = 'block';
    selectedRole = null;
  });
});
