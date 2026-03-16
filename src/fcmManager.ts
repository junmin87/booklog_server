import * as admin from 'firebase-admin';
import { ServiceAccount } from 'firebase-admin';

class FCMManager {
  private static instance: FCMManager;
  private initialized: boolean = false;

  constructor() {
    if (FCMManager.instance) {
      return FCMManager.instance;
    }

    this.initializeApp();
    FCMManager.instance = this;
  }

  private initializeApp(): void {
    if (this.initialized) return;

    console.log('Project ID:', process.env.FIREBASE_PROJECT_ID);
    console.log('Client Email exists:', !!process.env.FIREBASE_CLIENT_EMAIL);
    console.log('Private Key exists:', !!process.env.FIREBASE_PRIVATE_KEY);

    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
      throw new Error('Missing Firebase credentials in environment variables');
    }

    const serviceAccount: ServiceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };

    console.log('Service Account:', {
      projectId: serviceAccount.projectId,
      clientEmail: serviceAccount.clientEmail,
      privateKeyExists: !!serviceAccount.privateKey,
    });

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    this.initialized = true;
  }

  async sendPushNotification(title: string, content: string): Promise<string> {
    console.log('sendPushNotification 함수 시작 >>', { title, content });
    try {
      const message: admin.messaging.Message = {
        notification: {
          title,
          body: content,
        },
        topic: 'daily',
      };

      const response = await admin.messaging().send(message);
      console.log('푸시 알림 전송 성공:', response);
      return response;
    } catch (error) {
      console.error('푸시 알림 전송 중 오류 발생 >>>', error);
      throw error;
    }
  }
}

export default new FCMManager();
