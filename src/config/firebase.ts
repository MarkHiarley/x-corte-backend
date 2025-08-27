import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN', 
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.warn('⚠️ Variáveis de ambiente do Firebase em falta:', missingVars);
  console.warn('⚠️ Configure o arquivo .env para usar o Firestore corretamente.');
}

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || '',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.FIREBASE_APP_ || ''
};

export const isFirebaseConfigured = () => {
  return requiredEnvVars.every(varName => process.env[varName] && process.env[varName].length > 0);
};

let app: any = null;
let db: any = null;
let auth: any = null;

if (isFirebaseConfigured()) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    console.log('✅ Firebase inicializado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao inicializar Firebase:', error);
  }
} else {
  console.log('ℹ️ Firebase não configurado. Verifique as variáveis de ambiente.');
}

export { app, db, auth };
