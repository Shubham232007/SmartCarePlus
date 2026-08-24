import axios from 'axios';
import { ENV } from '../config/env';

export const processVoiceWithAIServer = async (patientId: string, transcript: string): Promise<string> => {
  try {
    const response = await axios.post(
      `${ENV.AI_SERVER_URL}/api/voice`,
      {
        patientId,
        transcript,
      },
      { timeout: 4000 }
    );

    if (response.data && response.data.reply) {
      return response.data.reply;
    }

    return 'SmartCare+ AI received your prompt: ' + transcript;
  } catch (error: any) {
    console.warn(`⚠️ Flask AI server unavailable at ${ENV.AI_SERVER_URL}:`, error.message);
    return 'AI service currently unavailable. Please contact nursing staff for urgent assistance.';
  }
};
