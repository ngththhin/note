import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAqPy_n-kxombv1N25rFdmh-ncuUqI2Dkg",
  authDomain: "note-8a4bd.firebaseapp.com",
  projectId: "note-8a4bd",
  storageBucket: "note-8a4bd.firebasestorage.app",
  messagingSenderId: "209137146809",
  appId: "1:209137146809:web:6d843e5f8a016793ee7468"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
