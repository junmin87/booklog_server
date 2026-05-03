import { Request, Response, NextFunction } from 'express';
import { sendPushNotification } from '../fcmManager';

export async function sendPush(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, content, topic } = req.body;
    const result = await sendPushNotification(
      title || '오늘의 문장',
      content || '오늘도 좋은 문장을 만나보세요',
      topic || 'daily'
    );
    res.status(200).json({ success: true, result });
  } catch (error) {
    next(error);
  }
}