import { redis } from "../config/redis.js";
import { sendMessage } from "./sendmessage.js";

interface SimpleReminderData {
  bookingId: string;
  clientName: string;
  clientPhone: string;
  productName: string;
  bookingDateTime: string;
}

export async function scheduleSimpleReminder(
  bookingId: string,
  data: SimpleReminderData,
  delaySeconds: number
): Promise<boolean> {
  try {
    console.log(`Agendando lembrete para ${data.clientName} em ${delaySeconds}s`);
    
    if (delaySeconds <= 0) {
      console.log("Delay inválido, não agendando");
      return false;
    }

    const reminderKey = `reminder:${bookingId}`;
    const reminderValue = JSON.stringify({
      ...data,
      scheduledFor: Date.now() + (delaySeconds * 1000)
    });

    await redis.setex(reminderKey, delaySeconds + 60, reminderValue);

    setTimeout(async () => {
      await executeReminder(bookingId, data);
    }, delaySeconds * 1000);

    console.log(`Lembrete agendado: ${bookingId}`);
    return true;
  } catch (error) {
    console.error("Erro ao agendar lembrete:", error);
    return false;
  }
}

async function executeReminder(bookingId: string, data: SimpleReminderData) {
  try {
    console.log(`\nExecutando lembrete: ${bookingId}`);

    const reminderExists = await redis.exists(`reminder:${bookingId}`);
    
    if (!reminderExists) {
      console.log("Lembrete foi cancelado, não enviando");
      return;
    }

    let phone = data.clientPhone.replace(/\D/g, '');
    if (!phone.startsWith('55')) {
      phone = '55' + phone;
    }

    const bookingDate = new Date(data.bookingDateTime);
    
    const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit'
    });

    const formattedDate = dateFormatter.format(bookingDate);
    const formattedTime = timeFormatter.format(bookingDate);

    const message = `Lembrete de Agendamento

Olá ${data.clientName}!

Seu agendamento está chegando:

Serviço: ${data.productName}
Data: ${formattedDate}
Horário: ${formattedTime}

Nos vemos em breve!`;

    console.log(`Enviando para: ${phone}`);
    console.log(`Data/Hora do agendamento: ${formattedDate} às ${formattedTime}`);
    
    const result = await sendMessage(phone, message);
    console.log(`Lembrete enviado!`, result);

    await redis.del(`reminder:${bookingId}`);
    console.log(message);
    
  } catch (error: any) {
    console.error(`Erro ao executar lembrete ${bookingId}:`, error);
    
    await redis.setex(`reminder:${bookingId}:error`, 3600, JSON.stringify({
      error: error.message,
      timestamp: Date.now()
    }));
  }
}

export async function cancelSimpleReminder(bookingId: string): Promise<boolean> {
  try {
    const result = await redis.del(`reminder:${bookingId}`);
    console.log(`Lembrete ${result > 0 ? 'cancelado' : 'não encontrado'}: ${bookingId}`);
    return result > 0;
  } catch (error) {
    console.error("Erro ao cancelar lembrete:", error);
    return false;
  }
}

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
    console.error("Erro ao buscar lembretes:", error);
    return [];
  }
}