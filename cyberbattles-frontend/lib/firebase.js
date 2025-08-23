// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAfSweskZpPoRKANnPjdb_xZ-s_FfxoV7A",
  authDomain: "cyberbattles-dd31f.firebaseapp.com",
  projectId: "cyberbattles-dd31f",
  storageBucket: "cyberbattles-dd31f.firebasestorage.app",
  messagingSenderId: "240664849654",
  appId: "1:240664849654:web:2b08b4ea54b1361fee90d7",
  measurementId: "G-HBZ8Y846ZQ"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);