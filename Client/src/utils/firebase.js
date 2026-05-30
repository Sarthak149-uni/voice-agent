import { initializeApp } from "firebase/app";
import {getAuth, GoogleAuthProvider} from "firebase/auth"
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "elliraai.firebaseapp.com",
  projectId: "elliraai",
  storageBucket: "elliraai.firebasestorage.app",
  messagingSenderId: "1095099448118",
  appId: "1:1095099448118:web:6cbcb1b989228c5fc99197"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const auth = getAuth(app)
const provider = new GoogleAuthProvider()

export {auth , provider}

