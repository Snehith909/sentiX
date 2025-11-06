// Firebase config (web)
// NOTE: you can move these values into environment variables as needed
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

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

// Firestore and Storage exports for client use
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, googleProvider, db, storage };

export default app;
