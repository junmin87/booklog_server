import { admin } from './lib/firebase';

// export async function sendPushNotification(title: string, content: string): Promise<string> {
//   console.log('sendPushNotification 함수 시작 >>', { title, content });
//   try {
//     const message: admin.messaging.Message = {
//       notification: {
//         title,
//         body: content,
//       },
//       topic: 'daily',
//     };

//     const response = await admin.messaging().send(message);
//     console.log('푸시 알림 전송 성공:', response);
//     return response;
//   } catch (error) {
//     console.error('푸시 알림 전송 중 오류 발생 >>>', error);
//     throw error;
//   }
// }

export async function sendPushNotification(
  title: string, 
  content: string, 
  topic: string = 'daily'  // 기본값 daily, 다른 토픽도 가능
): Promise<string> {
  console.log('sendPushNotification 함수 시작 >>', { title, content, topic });
  try {
    const message: admin.messaging.Message = {
      notification: {
        title,
        body: content,
      },
      topic,
    };

    const response = await admin.messaging().send(message);
    console.log('푸시 알림 전송 성공:', response);
    return response;
  } catch (error) {
    console.error('푸시 알림 전송 중 오류 발생 >>>', error);
    throw error;
  }
}
