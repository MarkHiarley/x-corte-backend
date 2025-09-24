interface SendMessageBody {
  number: string;
  text: string;
}


export async function sendMessage(number: string, text: string): Promise<any> {
    const url = 'http://92.113.34.172:8080/message/sendText/teste';
    
    const body: SendMessageBody = {
      number: number,
      text: text
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.EVOLUTION_API_KEY || '',
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      throw error;
    }
  }