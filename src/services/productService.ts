import { db, isFirebaseConfigured } from "../config/firebase.js";
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { Product } from "../types/index.js";
import { createSuccessResponse, createErrorResponse, standardMessages, logError, logInfo, ApiResponse } from '../utils/responseHelpers.js';

function convertDate(dateField: any): Date {
    if (!dateField) return new Date();
    if (typeof dateField.toDate === 'function') return dateField.toDate();
    if (dateField instanceof Date) return dateField;
    if (typeof dateField === 'string') return new Date(dateField);
    return new Date();
}

export const productService = {
    sanitizeDocumentId(name: string): string {
        return name
            .toLowerCase()
            .trim()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9\-_]/g, "")
            .replace(/--+/g, "-")
            .replace(/^-|-$/g, "");
    },

    async getProducts(enterpriseEmail: string): Promise<ApiResponse<Product[]>> {
        try {
            logInfo('getProducts', `Buscando produtos para empresa: ${enterpriseEmail}`);

            if (!enterpriseEmail || enterpriseEmail.trim() === '') {
                return createErrorResponse(
                    'Email da empresa é obrigatório',
                    'Email da empresa não fornecido'
                );
            }

            if (!isFirebaseConfigured()) {
                logError('getProducts', new Error('Firebase não configurado'));
                return createErrorResponse(
                    'Configuração inválida',
                    'Firebase não configurado. Verifique as variáveis de ambiente.'
                );
            }

            const snapshot = await getDocs(collection(db, `enterprises/${enterpriseEmail}/products`));
            
            if (snapshot.empty) {
                logInfo('getProducts', 'Nenhum produto encontrado', { enterpriseEmail });
                return createSuccessResponse(
                    'Nenhum produto cadastrado ainda',
                    []
                );
            }

            const products: Product[] = [];
            
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data) {
                    products.push({
                        id: doc.id,
                        name: data.name || '',
                        price: data.price || 0,
                        duration: data.duration || 0,
                        description: data.description || '',
                        category: data.category || '',
                        isActive: data.isActive !== false,
                        createdAt: convertDate(data.createdAt),
                        updatedAt: convertDate(data.updatedAt)
                    });
                }
            });

            if (products.length === 0) {
                return createSuccessResponse(
                    'Nenhum produto válido encontrado',
                    []
                );
            }

            logInfo('getProducts', `${products.length} produtos recuperados`, { enterpriseEmail });

            return createSuccessResponse(
                standardMessages.listed('produtos'),
                products
            );
        } catch (error: any) {
            logError('getProducts', error, { enterpriseEmail });
            return createErrorResponse(
                standardMessages.internalError,
                error.message
            );
        }
    },

    async getActiveProducts(enterpriseEmail: string): Promise<ApiResponse<Product[]>> {
        try {
            logInfo('getActiveProducts', `Buscando produtos ativos para empresa: ${enterpriseEmail}`);

            if (!enterpriseEmail || enterpriseEmail.trim() === '') {
                return createErrorResponse(
                    'Email da empresa é obrigatório',
                    'Email da empresa não fornecido'
                );
            }

            if (!isFirebaseConfigured()) {
                logError('getActiveProducts', new Error('Firebase não configurado'));
                return createErrorResponse(
                    'Configuração inválida',
                    'Firebase não configurado. Verifique as variáveis de ambiente.'
                );
            }

            const snapshot = await getDocs(collection(db, `enterprises/${enterpriseEmail}/products`));
            
            if (snapshot.empty) {
                logInfo('getActiveProducts', 'Nenhum produto encontrado', { enterpriseEmail });
                return createSuccessResponse(
                    'Nenhum produto cadastrado ainda',
                    []
                );
            }

            const products: Product[] = [];
            
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data && data.isActive !== false) { // Filtrar apenas produtos ativos
                    products.push({
                        id: doc.id,
                        name: data.name || '',
                        price: data.price || 0,
                        duration: data.duration || 0,
                        description: data.description || '',
                        category: data.category || '',
                        isActive: data.isActive !== false,
                        createdAt: convertDate(data.createdAt),
                        updatedAt: convertDate(data.updatedAt)
                    });
                }
            });

            if (products.length === 0) {
                return createSuccessResponse(
                    'Nenhum produto ativo encontrado',
                    []
                );
            }

            logInfo('getActiveProducts', `${products.length} produtos ativos recuperados`, { enterpriseEmail });

            return createSuccessResponse(
                standardMessages.listed('produtos ativos'),
                products
            );
        } catch (error: any) {
            logError('getActiveProducts', error, { enterpriseEmail });
            return createErrorResponse(
                standardMessages.internalError,
                error.message
            );
        }
    },

    async getProductById(enterpriseEmail: string, id: string): Promise<ApiResponse<Product>> {
        try {
            logInfo('getProductById', `Buscando produto: ${id}`, { enterpriseEmail });

            if (!enterpriseEmail || enterpriseEmail.trim() === '') {
                return createErrorResponse(
                    'Email da empresa é obrigatório',
                    'Email da empresa não fornecido'
                );
            }

            if (!id || id.trim() === '') {
                return createErrorResponse(
                    'ID do produto é obrigatório',
                    'ID do produto não fornecido'
                );
            }

            if (!isFirebaseConfigured()) {
                logError('getProductById', new Error('Firebase não configurado'));
                return createErrorResponse(
                    'Configuração inválida',
                    'Firebase não configurado. Verifique as variáveis de ambiente.'
                );
            }

            const docRef = doc(db, `enterprises/${enterpriseEmail}/products`, id);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
                logError('getProductById', new Error('Produto não encontrado'), { id, enterpriseEmail });
                return createErrorResponse(
                    standardMessages.notFound('Produto'),
                    `Produto com ID ${id} não encontrado`
                );
            }

            const data = docSnap.data();
            if (!data) {
                return createErrorResponse(
                    'Dados do produto corrompidos',
                    'Produto existe mas dados não puderam ser recuperados'
                );
            }

            const product: Product = {
                id: docSnap.id,
                name: data.name || '',
                price: data.price || 0,
                duration: data.duration || 0,
                description: data.description || '',
                category: data.category || '',
                isActive: data.isActive !== false,
                createdAt: convertDate(data.createdAt),
                updatedAt: convertDate(data.updatedAt)
            };

            logInfo('getProductById', 'Produto recuperado com sucesso', { id });

            return createSuccessResponse(
                standardMessages.retrieved('Produto'),
                product
            );
        } catch (error: any) {
            logError('getProductById', error, { id, enterpriseEmail });
            return createErrorResponse(
                standardMessages.internalError,
                error.message
            );
        }
    },

    async createProduct(enterpriseEmail: string, productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Product>> {
        try {
            logInfo('createProduct', `Criando produto: ${productData.name}`, { enterpriseEmail });

            if (!enterpriseEmail || enterpriseEmail.trim() === '') {
                return createErrorResponse(
                    'Email da empresa é obrigatório',
                    'Email da empresa não fornecido'
                );
            }

            if (!isFirebaseConfigured()) {
                logError('createProduct', new Error('Firebase não configurado'));
                return createErrorResponse(
                    'Configuração inválida',
                    'Firebase não configurado. Verifique as variáveis de ambiente.'
                );
            }

            const productId = this.sanitizeDocumentId(productData.name);
            const now = Timestamp.now();
            const docData = {
                ...productData,
                createdAt: now,
                updatedAt: now
            };

            const docRef = doc(db, `enterprises/${enterpriseEmail}/products`, productId);
            await setDoc(docRef, docData);

            const product: Product = {
                id: productId,
                ...productData,
                createdAt: now.toDate(),
                updatedAt: now.toDate()
            };

            logInfo('createProduct', 'Produto criado com sucesso', { productId, enterpriseEmail });

            return createSuccessResponse(
                standardMessages.created('Produto'),
                product
            );
        } catch (error: any) {
            logError('createProduct', error, { enterpriseEmail, productName: productData.name });
            return createErrorResponse(
                standardMessages.internalError,
                error.message
            );
        }
    },

    async updateProduct(enterpriseEmail: string, id: string, productData: Partial<Omit<Product, 'id' | 'createdAt'>>): Promise<ApiResponse<Product>> {
        try {
            logInfo('updateProduct', `Atualizando produto: ${id}`, { enterpriseEmail });

            if (!enterpriseEmail || enterpriseEmail.trim() === '') {
                return createErrorResponse(
                    'Email da empresa é obrigatório',
                    'Email da empresa não fornecido'
                );
            }

            if (!id || id.trim() === '') {
                return createErrorResponse(
                    'ID do produto é obrigatório',
                    'ID do produto não fornecido'
                );
            }

            if (!isFirebaseConfigured()) {
                logError('updateProduct', new Error('Firebase não configurado'));
                return createErrorResponse(
                    'Configuração inválida',
                    'Firebase não configurado. Verifique as variáveis de ambiente.'
                );
            }

            const docRef = doc(db, `enterprises/${enterpriseEmail}/products`, id);
            const updateData = {
                ...productData,
                updatedAt: Timestamp.now()
            };

            await updateDoc(docRef, updateData);

            const updatedDoc = await getDoc(docRef);
            
            if (!updatedDoc.exists()) {
                return createErrorResponse(
                    standardMessages.notFound('Produto'),
                    `Produto com ID ${id} não encontrado`
                );
            }

            const data = updatedDoc.data();
            const product: Product = {
                id: updatedDoc.id,
                name: data?.name || '',
                price: data?.price || 0,
                duration: data?.duration || 0,
                description: data?.description || '',
                category: data?.category || '',
                isActive: data?.isActive !== false,
                createdAt: convertDate(data?.createdAt),
                updatedAt: convertDate(data?.updatedAt)
            };

            logInfo('updateProduct', 'Produto atualizado com sucesso', { id, enterpriseEmail });

            return createSuccessResponse(
                standardMessages.updated('Produto'),
                product
            );
        } catch (error: any) {
            logError('updateProduct', error, { id, enterpriseEmail });
            return createErrorResponse(
                standardMessages.internalError,
                error.message
            );
        }
    },

    async deleteProduct(enterpriseEmail: string, id: string): Promise<ApiResponse<null>> {
        try {
            logInfo('deleteProduct', `Deletando produto: ${id}`, { enterpriseEmail });

            if (!enterpriseEmail || enterpriseEmail.trim() === '') {
                return createErrorResponse(
                    'Email da empresa é obrigatório',
                    'Email da empresa não fornecido'
                );
            }

            if (!id || id.trim() === '') {
                return createErrorResponse(
                    'ID do produto é obrigatório',
                    'ID do produto não fornecido'
                );
            }

            if (!isFirebaseConfigured()) {
                logError('deleteProduct', new Error('Firebase não configurado'));
                return createErrorResponse(
                    'Configuração inválida',
                    'Firebase não configurado. Verifique as variáveis de ambiente.'
                );
            }

            const docRef = doc(db, `enterprises/${enterpriseEmail}/products`, id);
            
            // Verificar se o produto existe antes de deletar
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) {
                return createErrorResponse(
                    standardMessages.notFound('Produto'),
                    `Produto com ID ${id} não encontrado`
                );
            }

            await deleteDoc(docRef);

            logInfo('deleteProduct', 'Produto deletado com sucesso', { id, enterpriseEmail });

            return createSuccessResponse(
                standardMessages.deleted('Produto'),
                null
            );
        } catch (error: any) {
            logError('deleteProduct', error, { id, enterpriseEmail });
            return createErrorResponse(
                standardMessages.internalError,
                error.message
            );
        }
    }
};
