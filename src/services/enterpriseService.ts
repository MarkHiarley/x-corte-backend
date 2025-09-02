import { db, isFirebaseConfigured } from "../config/firebase.js";
import { collection, getDocs, doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { Enterprise } from "../types/index.js";
import { createSuccessResponse, createErrorResponse, standardMessages, logError, logInfo, ApiResponse } from '../utils/responseHelpers.js';

function convertDate(dateField: any): Date {
    if (!dateField) return new Date();
    if (typeof dateField.toDate === 'function') return dateField.toDate();
    if (dateField instanceof Date) return dateField;
    if (typeof dateField === 'string') return new Date(dateField);
    return new Date();
}

export const enterpriseService = {
    async getAllEnterprises(): Promise<ApiResponse<Enterprise[]>> {
        try {
            logInfo('getAllEnterprises', 'Buscando todas as empresas');

            if (!isFirebaseConfigured()) {
                logError('getAllEnterprises', new Error('Firebase não configurado'));
                return createErrorResponse(
                    'Configuração inválida',
                    'Firebase não configurado. Verifique as variáveis de ambiente.'
                );
            }

            const snapshot = await getDocs(collection(db, 'enterprises'));
            
            if (snapshot.empty) {
                logInfo('getAllEnterprises', 'Nenhuma empresa encontrada');
                return createSuccessResponse(
                    'Nenhuma empresa cadastrada ainda',
                    []
                );
            }

            const enterprises: Enterprise[] = [];
            
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data) {
                    enterprises.push({
                        email: doc.id,
                        name: data.name || 'Nome não informado',
                        phone: data.phone || '',
                        address: data.address || '',
                        createdAt: convertDate(data.createdAt),
                        updatedAt: convertDate(data.updatedAt)
                    });
                }
            });

            if (enterprises.length === 0) {
                return createSuccessResponse(
                    'Nenhuma empresa válida encontrada',
                    []
                );
            }

            logInfo('getAllEnterprises', `${enterprises.length} empresas recuperadas`);

            return createSuccessResponse(
                standardMessages.listed('empresas'),
                enterprises
            );
        } catch (error: any) {
            logError('getAllEnterprises', error);
            return createErrorResponse(
                standardMessages.internalError,
                error.message
            );
        }
    },

    async getEnterpriseByEmail(email: string) {
        try {
            if (!isFirebaseConfigured()) {
                return {
                    success: false,
                    error: 'Firebase não configurado. Verifique as variáveis de ambiente.'
                };
            }

            const enterpriseRef = doc(db, 'enterprises', email);
            const enterpriseSnap = await getDoc(enterpriseRef);
            
            if (!enterpriseSnap.exists()) {
                return {
                    success: false,
                    error: `Empresa com email "${email}" não encontrada`
                };
            }

            const data = enterpriseSnap.data();
            const enterprise: Enterprise = {
                email: enterpriseSnap.id,
                name: data.name || 'Nome não informado',
                phone: data.phone || '',
                address: data.address || '',
                createdAt: convertDate(data.createdAt),
                updatedAt: convertDate(data.updatedAt)
            };

            return { success: true, data: enterprise };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            };
        }
    },

    async createEnterprise(enterpriseData: Omit<Enterprise, 'createdAt' | 'updatedAt'>) {
        try {
            if (!isFirebaseConfigured()) {
                return {
                    success: false,
                    error: 'Firebase não configurado. Verifique as variáveis de ambiente.'
                };
            }

            const existingEnterprise = await this.getEnterpriseByEmail(enterpriseData.email);
            if (existingEnterprise.success) {
                return {
                    success: false,
                    error: `Empresa com email "${enterpriseData.email}" já existe`
                };
            }

            const now = Timestamp.now();
            const enterpriseToCreate = {
                ...enterpriseData,
                createdAt: now,
                updatedAt: now
            };

            const enterpriseRef = doc(db, 'enterprises', enterpriseData.email);
            await setDoc(enterpriseRef, enterpriseToCreate);

            return {
                success: true,
                data: {
                    ...enterpriseData,
                    createdAt: now.toDate(),
                    updatedAt: now.toDate()
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
