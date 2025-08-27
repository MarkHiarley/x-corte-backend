import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db, app } from '../config/firebase.js';

const auth = getAuth(app);

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'client';
  enterpriseEmail?: string; // Para admins
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const authService = {
  async registerUser(
    email: string, 
    password: string, 
    name: string, 
    role: 'admin' | 'client',
    enterpriseEmail?: string,
    phone?: string
  ) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userProfile = {
        email: user.email!,
        name,
        role,
        ...(role === 'admin' && enterpriseEmail && { enterpriseEmail }),
        ...(phone && { phone }),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await setDoc(doc(db, 'users', user.uid), {
        ...userProfile,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      return {
        success: true,
        data: {
          uid: user.uid,
          ...userProfile
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  },

  async login(email: string, password: string) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        return {
          success: false,
          error: 'Perfil do usuário não encontrado'
        };
      }

      const userData = userDoc.data();
      const token = await user.getIdToken();

      return {
        success: true,
        data: {
          uid: user.uid,
          email: user.email,
          token,
          profile: {
            ...userData,
            createdAt: userData.createdAt?.toDate(),
            updatedAt: userData.updatedAt?.toDate()
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Credenciais inválidas'
      };
    }
  },

  async logout() {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro no logout'
      };
    }
  },

  async verifyToken(_token: string) {
    try {
      return {
        success: true,
        data: { valid: true }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Token inválido'
      };
    }
  },

  async getUserProfile(uid: string) {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      
      if (!userDoc.exists()) {
        return {
          success: false,
          error: 'Usuário não encontrado'
        };
      }

      const userData = userDoc.data();
      
      return {
        success: true,
        data: {
          uid,
          ...userData,
          createdAt: userData.createdAt?.toDate(),
          updatedAt: userData.updatedAt?.toDate()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }
};
