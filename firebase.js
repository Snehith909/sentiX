// Firebase config (web)
// NOTE: you can move these values into environment variables as needed
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCytuTsoiehpKNKH3-sKbw1WOrFnJQ49eo",
  authDomain: "sentix-bf04e.firebaseapp.com",
  projectId: "sentix-bf04e",
  storageBucket: "sentix-bf04e.firebasestorage.app",
  messagingSenderId: "275438850685",
  appId: "1:275438850685:web:3ebe243cbcfbe8b41c9714",
  measurementId: "G-X2YKX37TDG"
};

const app = initializeApp(firebaseConfig);
try{
  const analytics = getAnalytics(app);
}catch(e){
  // analytics may fail in non-browser environments or without window
}

// Firebase Auth exports
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, googleProvider };

export default app;
