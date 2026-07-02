import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import authRouter from './routes/auth.routes';
import userRouter from './routes/user.routes';
import bookRouter from './routes/book.routes';
import { errorHandler } from './middlewares/errorHandler';
import { defaultLimiter } from './middlewares/rateLimiter';
import { responseWrapper } from './middlewares/responseWrapper';
import pushRouter from './routes/push.routes';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(cors());

// Health check: no auth, no rate limiter (registered before defaultLimiter).
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(defaultLimiter);

app.use((req: Request, res: express.Response, next: NextFunction) => {
  if (req.method === 'POST') {
    console.log('Request Headers:', req.headers);
    console.log('Raw Body:', req.body);
    console.log('Content-Type:', req.header('content-type'));
  }
  next();
});

app.use('/', authRouter);
app.use('/', userRouter);
app.use('/', bookRouter);
app.use('/', pushRouter);

// API v2: same routers, standardized response envelope via responseWrapper.
// Existing unprefixed routes above are untouched (still serve the Flutter app).
app.use('/api/v2', responseWrapper, authRouter);
app.use('/api/v2', responseWrapper, userRouter);
app.use('/api/v2', responseWrapper, bookRouter);
app.use('/api/v2', responseWrapper, pushRouter);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app;
