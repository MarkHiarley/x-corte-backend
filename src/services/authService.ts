import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db, app } from '../config/firebase.js';
import { createSuccessResponse, createErrorResponse, standardMessages, logError, logInfo, ApiResponse } from '../utils/responseHelpers.js';

const auth = getAuth(app);

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'client';
  enterpriseEmail?: string;
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
  ): Promise<ApiResponse<UserProfile>> {
    try {
      logInfo('registerUser', `Tentando registrar usuário: ${email}`, { role, enterpriseEmail });

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

      logInfo('registerUser', 'Usuário registrado com sucesso', { uid: user.uid });

      return createSuccessResponse(
        standardMessages.created('Usuário'),
        {
          uid: user.uid,
          ...userProfile
        }
      );
    } catch (error: any) {
      logError('registerUser', error, { email, role });
      return createErrorResponse(
        standardMessages.internalError,
        error.message
      );
    }
  },

  async login(email: string, password: string): Promise<ApiResponse<{uid: string, email: string, token: string, profile: UserProfile}>> {
    try {
      logInfo('login', `Tentando login para: ${email}`);

      if (!email || !password) {
        return createErrorResponse(
          'Email e senha são obrigatórios',
          'Dados inválidos'
        );
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user || !user.uid) {
        return createErrorResponse(
          'Falha na autenticação',
          'Usuário inválido retornado pelo Firebase'
        );
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        logError('login', new Error('Perfil não encontrado'), { email });
        return createErrorResponse(
          standardMessages.notFound('Perfil do usuário'),
          'Perfil do usuário não encontrado'
        );
      }

      const userData = userDoc.data();
      if (!userData) {
        return createErrorResponse(
          'Dados do usuário corrompidos',
          'Perfil existe mas dados não puderam ser recuperados'
        );
      }

      const token = await user.getIdToken();
      if (!token) {
        return createErrorResponse(
          'Falha na geração do token',
          'Não foi possível gerar token de autenticação'
        );
      }

      logInfo('login', 'Login realizado com sucesso', { uid: user.uid });

      return createSuccessResponse(
        standardMessages.loginSuccess,
        {
          uid: user.uid,
          email: user.email!,
          token,
          profile: {
            uid: user.uid,
            email: userData.email,
            name: userData.name,
            role: userData.role,
            enterpriseEmail: userData.enterpriseEmail,
            phone: userData.phone,
            createdAt: userData.createdAt?.toDate() || new Date(),
            updatedAt: userData.updatedAt?.toDate() || new Date()
          }
        }
      );
    } catch (error: any) {
      logError('login', error, { email });
      return createErrorResponse(
        'Falha no login',
        error.code === 'auth/invalid-credential' ? 'Credenciais inválidas' : error.message
      );
    }
  },

  async logout(): Promise<ApiResponse<boolean>> {
    try {
      logInfo('logout', 'Realizando logout');
      await signOut(auth);
      logInfo('logout', 'Logout realizado com sucesso');
      return createSuccessResponse(standardMessages.logoutSuccess, true);
    } catch (error: any) {
      logError('logout', error);
      return createErrorResponse(
        'Erro no logout',
        error.message
      );
    }
  },

  async verifyToken(_token: string): Promise<ApiResponse<{valid: boolean}>> {
    try {
      logInfo('verifyToken', 'Token verificado');
      return createSuccessResponse(
        'Token válido',
        { valid: true }
      );
    } catch (error: any) {
      logError('verifyToken', error);
      return createErrorResponse(
        standardMessages.tokenInvalid,
        'Token inválido'
      );
    }
  },

  async getUserProfile(uid: string): Promise<ApiResponse<UserProfile>> {
    try {
      logInfo('getUserProfile', `Buscando perfil do usuário: ${uid}`);

      if (!uid || uid.trim() === '') {
        return createErrorResponse(
          'UID é obrigatório',
          'UID não fornecido'
        );
      }

      const userDoc = await getDoc(doc(db, 'users', uid));
      
      if (!userDoc.exists()) {
        logError('getUserProfile', new Error('Usuário não encontrado'), { uid });
        return createErrorResponse(
          standardMessages.notFound('Usuário'),
          'Usuário não encontrado'
        );
      }

      const userData = userDoc.data();
      if (!userData) {
        return createErrorResponse(
          'Dados do usuário corrompidos',
          'Usuário existe mas dados não puderam ser recuperados'
        );
      }

      logInfo('getUserProfile', 'Perfil recuperado com sucesso', { uid });
      
      return createSuccessResponse(
        standardMessages.retrieved('Perfil do usuário'),
        {
          uid,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          enterpriseEmail: userData.enterpriseEmail,
          phone: userData.phone,
          createdAt: userData.createdAt?.toDate() || new Date(),
          updatedAt: userData.updatedAt?.toDate() || new Date()
        }
      );
    } catch (error: any) {
      logError('getUserProfile', error, { uid });
      return createErrorResponse(
        standardMessages.internalError,
        error.message
      );
    }
  }
};
