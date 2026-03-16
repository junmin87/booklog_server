import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import FCMManager from './fcmManager';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import qs from 'qs';

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

// JWT token validation
app.post('/validate-token', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(400).json({ error: 'accessToken 누락' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);

    const { userId, email, snsType } = decoded as {
      userId: string;
      email?: string;
      snsType: 'apple';
    };

    return res.status(200).json({
      valid: true,
      userId,
      email: email ?? null,
      snsType,
    });
  } catch (err) {
    console.error('[TOKEN VERIFY ERROR]', err);
    return res.status(401).json({
      valid: false,
      error: 'Invalid or expired token',
    });
  }
});

// Apple Sign In
app.post('/apple/login', async (req: Request, res: Response) => {
  const { userIdentifier, email, authorizationCode } = req.body;

  if (!userIdentifier) {
    return res.status(400).json({ error: 'userIdentifier 누락' });
  }

  const serverToken = jwt.sign(
    {
      snsType: 'apple',
      userId: userIdentifier,
      ...(email && { email }),
    },
    process.env.JWT_SECRET!,
    { expiresIn: '30d' }
  );

  let refreshToken: string | null = null;

  if (authorizationCode) {
    try {
      const clientSecret = generateAppleClientSecret();
      console.log('if authorizationCode >> ');

      const params = qs.stringify({
        client_id: process.env.APPLE_CLIENT_ID!,
        client_secret: clientSecret,
        code: authorizationCode,
        grant_type: 'authorization_code',
        redirect_uri: process.env.APPLE_REDIRECT_URI!,
      });

      const tokenResponse = await axios.post(
        'https://appleid.apple.com/auth/oauth2/v2/token',
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      refreshToken = tokenResponse.data.refresh_token;
      console.log('✅ Apple refresh_token 획득 성공');
    } catch (err) {
      console.error('❌ Apple authorizationCode 토큰 요청 실패:', err);
      return res.status(500).json({ error: 'Apple 토큰 요청 실패' });
    }
  }

  return res.json({
    serverToken,
    ...(refreshToken && { refreshToken }),
  });
});

// Apple token revocation
app.post('/apple/revoke', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: 'refreshToken is required' });
    }

    await revokeAppleToken(refreshToken);
    return res.status(200).json({ message: 'Apple token revoked successfully' });
  } catch (error) {
    console.error('❌ Apple revoke error:', error);
    return res.status(500).json({ message: 'Failed to revoke Apple token' });
  }
});

export async function revokeAppleToken(refreshToken: string) {
  const clientSecret = generateAppleClientSecret();

  const params = new URLSearchParams();
  params.append('token', refreshToken);
  params.append('token_type_hint', 'refresh_token');
  params.append('client_id', process.env.APPLE_CLIENT_ID!);
  params.append('client_secret', clientSecret);

  const response = await axios.post(
    'https://appleid.apple.com/auth/revoke',
    params.toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  if (response.status !== 200) {
    throw new Error(`Apple revoke failed: ${response.status}`);
  }
}

function generateAppleClientSecret(): string {
  const resolvedPath = path.resolve(__dirname, '../', process.env.APPLE_PRIVATE_KEY_PATH!);
  console.log('📁 Apple Private Key 실제 경로:', resolvedPath);

  const exists = fs.existsSync(resolvedPath);
  console.log('📁 파일 존재 여부:', exists);
  if (!exists) {
    throw new Error(`❌ Apple private key file not found at ${resolvedPath}`);
  }

  const privateKey = fs.readFileSync(resolvedPath, 'utf8');
  console.log('🔑 Apple Private Key 길이:', privateKey.length);

  const claims = {
    iss: process.env.APPLE_TEAM_ID,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 15777000,
    aud: 'https://appleid.apple.com',
    sub: process.env.APPLE_CLIENT_ID,
  };

  try {
    const token = jwt.sign(claims, privateKey, {
      algorithm: 'ES256',
      keyid: process.env.APPLE_KEY_ID,
      header: {
        alg: 'ES256',
        kid: process.env.APPLE_KEY_ID,
      },
    });
    console.log('✅ Apple client_secret 생성 완료');
    return token;
  } catch (err) {
    console.error('❌ Apple client_secret 생성 실패:', err);
    throw err;
  }
}

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app;
