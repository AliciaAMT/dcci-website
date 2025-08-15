import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { environment } from '../environments/environment';

// Initialize Firebase
export const firebaseApp = initializeApp(environment.firebase);

// Initialize Firebase services
export const db = getFirestore(firebaseApp);
export const auth = getAuth(firebaseApp);
export const storage = getStorage(firebaseApp);

export default firebaseApp;
