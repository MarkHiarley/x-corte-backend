import { db, isFirebaseConfigured } from "../config/firebase.js";
import { collection, getDocs, doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { Enterprise } from "../types/index.js";

function convertDate(dateField: any): Date {
    if (!dateField) return new Date();
    if (typeof dateField.toDate === 'function') return dateField.toDate();
    if (dateField instanceof Date) return dateField;
    if (typeof dateField === 'string') return new Date(dateField);
    return new Date();
}

export const enterpriseService = {
    async getAllEnterprises() {
        try {
            if (!isFirebaseConfigured()) {
                return {
                    success: false,
                    error: 'Firebase não configurado. Verifique as variáveis de ambiente.'
                };
            }

            const snapshot = await getDocs(collection(db, 'enterprises'));
            const enterprises: Enterprise[] = [];
            
            snapshot.forEach((doc) => {
                const data = doc.data();
                enterprises.push({
                    email: doc.id,
                    name: data.name || 'Nome não informado',
                    phone: data.phone || '',
                    address: data.address || '',
                    createdAt: convertDate(data.createdAt),
                    updatedAt: convertDate(data.updatedAt)
                });
            });

            return { success: true, data: enterprises };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            };
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
