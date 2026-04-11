import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import FCMManager from './fcmManager';
import authRouter from './routes/auth.routes';
import userRouter from './routes/user.routes';
import bookRouter from './routes/book.routes';
import { errorHandler } from './middlewares/errorHandler';

interface NotificationRequest {
  title: string;
  content: string;
}

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use((req: Request, res: express.Response, next: NextFunction) => {
  if (req.method === 'POST') {
    console.log('Request Headers:', req.headers);
    console.log('Raw Body:', req.body);
    console.log('Content-Type:', req.header('content-type'));
  }
  next();
});

// Push notification
app.post('/send-notification', async (req: express.Request, res: express.Response) => {
  try {
    console.log('Raw request body:', JSON.stringify(req.body));

    const { title, content } = req.body as NotificationRequest;

    if (!title || !content) {
      console.error('Missing required fields:', { title, content });
      return res.status(400).send('Title and content are required');
    }

    const response = await FCMManager.sendPushNotification(title, content);
    console.log('Push notification sent:', response);

    return res.status(200).send('notification sent successfully');
  } catch (error) {
    console.error('Error in send-notification endpoint:', error);
    return res.status(500).send('Failed to send notification');
  }
});

app.use('/', authRouter);
app.use('/', userRouter);
app.use('/', bookRouter);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app;
