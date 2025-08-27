import { FastifyRequest, FastifyReply } from 'fastify';
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || '',
  });
}

interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    uid: string;
    email: string;
    role?: string;
    enterpriseEmail?: string;
  };
}

export async function authenticate(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    const authorization = request.headers.authorization;
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return reply.status(401).send({
        success: false,
        message: 'Token de acesso requerido'
      });
    }

    const token = authorization.split(' ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    const { db } = await import('../config/firebase.js');
    const { doc, getDoc } = await import('firebase/firestore');
    
    const userDoc = await getDoc(doc(db, 'users', decodedToken.uid));
    
    if (!userDoc.exists()) {
      return reply.status(401).send({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    const userData = userDoc.data();
    
    request.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      role: userData?.role,
      enterpriseEmail: userData?.enterpriseEmail
    };

  } catch (error) {
    return reply.status(401).send({
      success: false,
      message: 'Token inválido'
    });
  }
}

export function requireRole(allowedRoles: string[]) {
  return async function(request: AuthenticatedRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    
    if (!request.user) {
      return reply.status(401).send({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    if (!allowedRoles.includes(request.user.role || '')) {
      return reply.status(403).send({
        success: false,
        message: 'Acesso negado. Permissão insuficiente.'
      });
    }
  };
}

export function requireAdmin(request: AuthenticatedRequest, reply: FastifyReply) {
  return requireRole(['admin'])(request, reply);
}

export function requireAdminOrClient(request: AuthenticatedRequest, reply: FastifyReply) {
  return requireRole(['admin', 'client'])(request, reply);
}
