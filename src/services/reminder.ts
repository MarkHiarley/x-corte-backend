import { redis } from "../config/redis.js";
import { sendMessage } from "./sendmessage.js";

interface SimpleReminderData {
  bookingId: string;
  clientName: string;
  clientPhone: string;
  productName: string;
  date: string;
  startTime: string;
}

// Armazenar lembretes no Redis com TTL
export async function scheduleSimpleReminder(
  bookingId: string,
  data: SimpleReminderData,
  delaySeconds: number
): Promise<boolean> {
  try {
    console.log(`📅 Agendando lembrete para ${data.clientName} em ${delaySeconds}s`);
    
    if (delaySeconds <= 0) {
      console.log("⚠️ Delay inválido, não agendando");
      return false;
    }

    // Salvar no Redis com TTL (expira automaticamente)
    const reminderKey = `reminder:${bookingId}`;
    const reminderValue = JSON.stringify({
      ...data,
      scheduledFor: Date.now() + (delaySeconds * 1000)
    });
    
    await redis.setex(reminderKey, delaySeconds + 60, reminderValue); // +60s margem
    
    // Agendar execução com setTimeout
    setTimeout(async () => {
      await executeReminder(bookingId, data);
    }, delaySeconds * 1000);
    
    console.log(`✅ Lembrete agendado: ${bookingId}`);
    return true;
    
  } catch (error) {
    console.error("❌ Erro ao agendar lembrete:", error);
    return false;
  }
}

// Executar lembrete
async function executeReminder(bookingId: string, data: SimpleReminderData) {
  try {
    console.log(`\n📤 Executando lembrete: ${bookingId}`);
    
    // Verificar se ainda existe no Redis (não foi cancelado)
    const reminderExists = await redis.exists(`reminder:${bookingId}`);
    if (!reminderExists) {
      console.log("🚫 Lembrete foi cancelado, não enviando");
      return;
    }
    
    // Formatar telefone
    let phone = data.clientPhone.replace(/\D/g, '');
    if (!phone.startsWith('55')) {
      phone = '55' + phone;
    }
    
    // Criar mensagem
    const message = `⏰ *Lembrete de Agendamento*

Olá ${data.clientName}! 👋

Seu agendamento está chegando:

🔸 *Serviço:* ${data.productName}
🔸 *Horário:* ${data.startTime}  
🔸 *Data:* ${new Date(data.date).toLocaleDateString('pt-BR')}

Nos vemos em breve! 😊`;

    // Enviar mensagem
    console.log(`📱 Enviando para: ${phone}`);
    const result = await sendMessage(phone, message);
    
    console.log(`✅ Lembrete enviado!`, result);
    
    // Remover do Redis após enviar
    await redis.del(`reminder:${bookingId}`);
    
  } catch (error:any) {
    console.error(`❌ Erro ao executar lembrete ${bookingId}:`, error);
    
    // Marcar como erro no Redis
    await redis.setex(`reminder:${bookingId}:error`, 3600, JSON.stringify({
      error: error.message,
      timestamp: Date.now()
    }));
  }
}

// Cancelar lembrete
export async function cancelSimpleReminder(bookingId: string): Promise<boolean> {
  try {
    const result = await redis.del(`reminder:${bookingId}`);
    console.log(`🗑️ Lembrete ${result > 0 ? 'cancelado' : 'não encontrado'}: ${bookingId}`);
    return result > 0;
  } catch (error) {
    console.error("❌ Erro ao cancelar lembrete:", error);
    return false;
  }
}

// Ver lembretes ativos
export async function getActiveReminders(): Promise<any[]> {
  try {
    const keys = await redis.keys('reminder:*');
    const activeKeys = keys.filter(key => !key.includes(':error'));
    
    const reminders = [];
    for (const key of activeKeys) {
      const data = await redis.get(key);
      if (data) {
        reminders.push({
          key,
          bookingId: key.split(':')[1],
          data: JSON.parse(data),
          ttl: await redis.ttl(key)
        });
      }
    }
    
    return reminders;
  } catch (error) {
    console.error("❌ Erro ao buscar lembretes:", error);
    return [];
  }
}
