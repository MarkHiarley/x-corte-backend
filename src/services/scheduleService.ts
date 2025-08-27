import { collection, addDoc, getDocs, query, where, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { Schedule } from '../types/index.js';

interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class ScheduleService {
  private readonly collectionName = 'schedules';

  async createSchedule(enterpriseEmail: string, scheduleData: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceResult<Schedule>> {
    try {
      const docData = {
        ...scheduleData,
        enterpriseEmail,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await addDoc(collection(db, this.collectionName), docData);
      
      const newSchedule: Schedule = {
        id: docRef.id,
        ...docData
      };

      return {
        success: true,
        data: newSchedule
      };
    } catch (error: any) {
      console.error('Erro ao criar schedule:', error);
      return {
        success: false,
        error: error.message || 'Erro ao criar schedule'
      };
    }
  }

  async getAllSchedules(enterpriseEmail: string): Promise<ServiceResult<Schedule[]>> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('enterpriseEmail', '==', enterpriseEmail)
      );
      
      const querySnapshot = await getDocs(q);
      const schedules: Schedule[] = [];

      querySnapshot.forEach((doc) => {
        schedules.push({
          id: doc.id,
          ...doc.data()
        } as Schedule);
      });

      return {
        success: true,
        data: schedules
      };
    } catch (error: any) {
      console.error('Erro ao buscar schedules:', error);
      return {
        success: false,
        error: error.message || 'Erro ao buscar schedules'
      };
    }
  }

  async getScheduleById(scheduleId: string): Promise<ServiceResult<Schedule>> {
    try {
      const docRef = doc(db, this.collectionName, scheduleId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return {
          success: false,
          error: 'Schedule não encontrado'
        };
      }

      const schedule: Schedule = {
        id: docSnap.id,
        ...docSnap.data()
      } as Schedule;

      return {
        success: true,
        data: schedule
      };
    } catch (error: any) {
      console.error('Erro ao buscar schedule:', error);
      return {
        success: false,
        error: error.message || 'Erro ao buscar schedule'
      };
    }
  }

  async updateSchedule(scheduleId: string, updateData: Partial<Schedule>): Promise<ServiceResult<Schedule>> {
    try {
      const docRef = doc(db, this.collectionName, scheduleId);
      
      const dataToUpdate = {
        ...updateData,
        updatedAt: new Date()
      };

      await updateDoc(docRef, dataToUpdate);

      // Buscar o documento atualizado
      const result = await this.getScheduleById(scheduleId);
      return result;
    } catch (error: any) {
      console.error('Erro ao atualizar schedule:', error);
      return {
        success: false,
        error: error.message || 'Erro ao atualizar schedule'
      };
    }
  }

  async deleteSchedule(scheduleId: string): Promise<ServiceResult<boolean>> {
    try {
      const docRef = doc(db, this.collectionName, scheduleId);
      await deleteDoc(docRef);

      return {
        success: true,
        data: true
      };
    } catch (error: any) {
      console.error('Erro ao deletar schedule:', error);
      return {
        success: false,
        error: error.message || 'Erro ao deletar schedule'
      };
    }
  }

  async getDefaultSchedule(enterpriseEmail: string): Promise<ServiceResult<Schedule | null>> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('enterpriseEmail', '==', enterpriseEmail),
        where('isDefault', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return {
          success: true,
          data: null
        };
      }

      const doc = querySnapshot.docs[0];
      const schedule: Schedule = {
        id: doc.id,
        ...doc.data()
      } as Schedule;

      return {
        success: true,
        data: schedule
      };
    } catch (error: any) {
      console.error('Erro ao buscar schedule padrão:', error);
      return {
        success: false,
        error: error.message || 'Erro ao buscar schedule padrão'
      };
    }
  }
}

export const scheduleService = new ScheduleService();
