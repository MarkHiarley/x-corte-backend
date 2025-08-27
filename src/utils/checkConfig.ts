import dotenv from 'dotenv';

dotenv.config();

interface FirebaseConfig {
  apiKey: string | undefined;
  authDomain: string | undefined;
  projectId: string | undefined;
  storageBucket: string | undefined;
  messagingSenderId: string | undefined;
  appId: string | undefined;
}

function checkFirebaseConfiguration(): void {
  console.log('Verificando configuração do Firebase...\n');

  const config: FirebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
  };

  console.log('Configurações encontradas:');
  
  for (const [key, value] of Object.entries(config)) {
    const status = (value && value.length > 0) ? 'OK' : 'MISSING';
    const displayValue = (value && value.length > 0) ? `${value.substring(0, 10)}...` : 'VAZIO';
    console.log(`  ${key}: ${status} (${displayValue})`);
  }

  console.log('');

  const missingConfig = Object.entries(config).filter(([_, value]) => !value || value.length === 0);

  if (missingConfig.length === 0) {
    console.log('Status: Todas as configurações do Firebase estão presentes');
    console.log('Próximo passo: Testar conexão com o Firestore');
  } else {
    console.log('Status: Configurações incompletas');
    console.log('Configurações em falta:');
    missingConfig.forEach(([key]) => console.log(`  - ${key}`));
    console.log('\nAção necessária: Preencher configurações no arquivo .env');
  }
}

checkFirebaseConfiguration();
