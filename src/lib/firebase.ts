/// <reference types="vite/client" />
import { initializeApp, FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfigManual from '../../firebase-applet-config.json';

const getFirebaseConfig = (): FirebaseOptions & { firestoreDatabaseId?: string } => {
  const envConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID,
  };

  // Check if at least the API Key is provided via env
  if (envConfig.apiKey) {
    return envConfig;
  }

  // Fallback to the generated config file
  return firebaseConfigManual;
};

const config = getFirebaseConfig();

const app = initializeApp(config);
export const db = getFirestore(app, config.firestoreDatabaseId || (config as any).firestoreDatabaseId);
export const auth = getAuth();

// Validate Connection to Firestore
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
