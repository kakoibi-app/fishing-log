import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBWhnMx2LGBtoBNgt0uQqQwKPPo2rrMrT4",
  authDomain: "fishing-log-d5457.firebaseapp.com",
  projectId: "fishing-log-d5457",
  storageBucket: "fishing-log-d5457.firebasestorage.app",
  messagingSenderId: "655281804604",
  appId: "1:655281804604:web:aa59cd4b6b52cf3a75fa39",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);