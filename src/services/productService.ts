import { db, isFirebaseConfigured } from "../config/firebase.js";
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { Product } from "../types/index.js";

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

    async getProducts(enterpriseEmail: string) {
        try {
            if (!isFirebaseConfigured()) {
                return {
                    success: false,
                    error: 'Firebase não configurado. Verifique as variáveis de ambiente.'
                };
            }

            const snapshot = await getDocs(collection(db, `enterprises/${enterpriseEmail}/products`));
            const products: Product[] = [];
            
            snapshot.forEach((doc) => {
                const data = doc.data();
                products.push({
                    id: doc.id,
                    name: data.name,
                    price: data.price,
                    duration: data.duration,
                    description: data.description || '',
                    category: data.category || '',
                    isActive: data.isActive !== false,
                    createdAt: convertDate(data.createdAt),
                    updatedAt: convertDate(data.updatedAt)
                });
            });

            return { success: true, data: products };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            };
        }
    },

    async getProductById(enterpriseEmail: string, id: string) {
        try {
            if (!isFirebaseConfigured()) {
                return {
                    success: false,
                    error: 'Firebase não configurado. Verifique as variáveis de ambiente.'
                };
            }

            const docRef = doc(db, `enterprises/${enterpriseEmail}/products`, id);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
                return { success: false, error: 'Produto não encontrado' };
            }

            const data = docSnap.data();
            const product: Product = {
                id: docSnap.id,
                name: data.name,
                price: data.price,
                duration: data.duration,
                description: data.description || '',
                category: data.category || '',
                isActive: data.isActive !== false,
                createdAt: convertDate(data.createdAt),
                updatedAt: convertDate(data.updatedAt)
            };

            return { success: true, data: product };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            };
        }
    },

    async createProduct(enterpriseEmail: string, productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) {
        try {
            if (!isFirebaseConfigured()) {
                return {
                    success: false,
                    error: 'Firebase não configurado. Verifique as variáveis de ambiente.'
                };
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

            return {
                success: true,
                data: {
                    id: productId,
                    ...productData,
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
    },

    async updateProduct(enterpriseEmail: string, id: string, productData: Partial<Omit<Product, 'id' | 'createdAt'>>) {
        try {
            if (!isFirebaseConfigured()) {
                return {
                    success: false,
                    error: 'Firebase não configurado. Verifique as variáveis de ambiente.'
                };
            }

            const docRef = doc(db, `enterprises/${enterpriseEmail}/products`, id);
            const updateData = {
                ...productData,
                updatedAt: Timestamp.now()
            };

            await updateDoc(docRef, updateData);

            const updatedDoc = await getDoc(docRef);
            const data = updatedDoc.data();

            return {
                success: true,
                data: {
                    id: updatedDoc.id,
                    ...data,
                    createdAt: convertDate(data?.createdAt),
                    updatedAt: convertDate(data?.updatedAt)
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            };
        }
    },

    async deleteProduct(enterpriseEmail: string, id: string) {
        try {
            if (!isFirebaseConfigured()) {
                return {
                    success: false,
                    error: 'Firebase não configurado. Verifique as variáveis de ambiente.'
                };
            }

            const docRef = doc(db, `enterprises/${enterpriseEmail}/products`, id);
            await deleteDoc(docRef);

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            };
        }
    },

    async getActiveProducts(enterpriseEmail: string) {
        try {
            const result = await this.getProducts(enterpriseEmail);
            
            if (!result.success || !result.data) {
                return result;
            }

            const activeProducts = result.data.filter(product => product.isActive);
            return { success: true, data: activeProducts };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            };
        }
    }
};
