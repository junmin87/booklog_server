import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import authRouter from './routes/auth.routes';
import userRouter from './routes/user.routes';
import bookRouter from './routes/book.routes';
import { errorHandler } from './middlewares/errorHandler';

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

app.use('/', authRouter);
app.use('/', userRouter);
app.use('/', bookRouter);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app;
