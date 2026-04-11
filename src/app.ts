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
import { createClient } from '@supabase/supabase-js';
import { authenticate } from './middlewares/auth';

interface NotificationRequest {
  title: string;
  content: string;
}


const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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




// 오토 로그인때 주로 사용함
// JWT token validation
app.post('/validate-token', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(400).json({ error: 'accessToken 누락' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // const decoded = jwt.verify(token, process.env.JWT_SECRET!);

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      dbUserId: string;
      email?: string;
      snsType: string;
    };

    const { userId, email, snsType } = decoded as {
      userId: string;
      email?: string;
      snsType: 'apple';
    };

    // const { data: user } = await supabase
    //   .from('booklog_users')
    //   .select('deleted_at, country_code')
    //   .eq('apple_user_id', userId)
    //   .single();

    // 이렇게 변경
    const { data: user } = await supabase
    .from('booklog_users')
    .select('deleted_at, country_code')
    .eq('id', decoded.dbUserId)  // ✅
    .single();

    if (!user || user.deleted_at !== null) {
      return res.status(401).json({ valid: false, error: 'User not found or deleted' });
    }

    return res.status(200).json({
      valid: true,
      userId,
      email: email ?? null,
      snsType,
      country_code: user.country_code ?? null,
    });
  } catch (err) {
    console.error('[TOKEN VERIFY ERROR]', err);
    return res.status(401).json({
      valid: false,
      error: 'Invalid or expired token',
    });
  }
});


app.get('/user/me', authenticate, async (req: Request, res: Response) => {
  try {
    const { data: user } = await supabase
      .from('booklog_users')
      .select('id, email, country_code, language_code, plan, deleted_at')
      .eq('id', req.user!.dbUserId)
      .single();

    if (!user || user.deleted_at !== null) {
      return res.status(401).json({ error: 'User not found or deleted' });
    }

    return res.status(200).json({
      id: user.id,
      email: user.email ?? null,
      countryCode: user.country_code ?? null,
      languageCode: user.language_code ?? null,
      plan: user.plan,
      snsType: req.user!.snsType,
      snsId: req.user!.userId,
    });
  } catch (err) {
    console.error('❌ 유저 정보 조회 실패:', err);
    return res.status(401).json({ error: 'Invalid token' });
  }
});



// Apple Sign In
app.post('/apple/login', async (req: Request, res: Response) => {
  const { userIdentifier, email, authorizationCode } = req.body;

  if (!userIdentifier) {
    return res.status(400).json({ error: 'userIdentifier 누락' });
  }

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

  let countryCode: string | null = null;
  let dbUserId: string | null = null;
  try {
    const result = await handleUserUpsert(userIdentifier, email ?? null, refreshToken);
    countryCode = result.countryCode;
    dbUserId = result.dbUserId;
  } catch (err) {
    console.error('❌ Supabase DB 처리 실패:', err);
  }

  const serverToken = jwt.sign(
    {
      snsType: 'apple',
      userId: userIdentifier,
      dbUserId: dbUserId,
      ...(email && { email }),
    },
    process.env.JWT_SECRET!,
    { expiresIn: '30d' }
  );

  return res.json({
    serverToken,
    ...(refreshToken && { refreshToken }),
    country_code: countryCode,
  });
});



// 애플 유저 아이디로 등록된 유저 데이터베이스가 있는 지 조회
// async function handleUserUpsert(
//   userIdentifier: string,
//   email: string | null,
//   refreshToken: string | null
// ): Promise<{ countryCode: string | null; dbUserId: string }> {
//   const { data: existingUser } = await supabase
//     .from('booklog_users')
//     .select('id, country_code')
//     .eq('apple_user_id', userIdentifier)
//     .single();

//   if (existingUser) {
//     return { countryCode: existingUser.country_code ?? null, dbUserId: existingUser.id };
//   }

//   const { data: newUser } = await supabase
//     .from('booklog_users')
//     .insert({ apple_user_id: userIdentifier, email, refresh_token: refreshToken })
//     .select('id')
//     .single();

//   return { countryCode: null, dbUserId: newUser!.id };
// }


async function handleUserUpsert(
  userIdentifier: string,
  email: string | null,
  appleRefreshToken: string | null
): Promise<{ countryCode: string | null; dbUserId: string }> {
  const { data: existingUser } = await supabase
    .from('booklog_users')
    .select('id, country_code')
    .eq('apple_user_id', userIdentifier)
    .single();

    if (existingUser) {
      await supabase
        .from('booklog_users')
        .update({
          last_login_at: new Date().toISOString(),
          deleted_at: null,
          ...(appleRefreshToken && { apple_refresh_token: appleRefreshToken }),
        })
        .eq('id', existingUser.id);
    
      return { countryCode: existingUser.country_code ?? null, dbUserId: existingUser.id };
    }

  const { data: newUser } = await supabase
    .from('booklog_users')
    .insert({
      apple_user_id: userIdentifier,
      email,
      apple_refresh_token: appleRefreshToken,
      last_login_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  return { countryCode: null, dbUserId: newUser!.id };
}



app.post('/user/country', authenticate, async (req: Request, res: Response) => {
  const { country_code, language_code } = req.body;

  if (!country_code) {
    return res.status(400).json({ error: 'country_code 누락' });
  }

  try {
    const { error } = await supabase
      .from('booklog_users')
      .update({ country_code, language_code })
      .eq('id', req.user!.dbUserId);  // ✅ UUID로 조회

    if (error) throw error;

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ country 업데이트 실패:', err);
    return res.status(500).json({ error: '업데이트 실패' });
  }
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


// 애플 탈퇴
app.delete('/user/apple', authenticate, async (req: Request, res: Response) => {
  try {
    const { data: user } = await supabase
      .from('booklog_users')
      .select('apple_refresh_token')
      .eq('id', req.user!.dbUserId)
      .single();

    if (!user) {
      return res.status(404).json({ error: '유저 없음' });
    }

    if (user.apple_refresh_token) {
      await revokeAppleToken(user.apple_refresh_token);
    }

    const { error } = await supabase
      .from('booklog_users')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', req.user!.dbUserId);

    if (error) throw error;

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ 계정 탈퇴 실패:', err);
    return res.status(500).json({ error: '계정 탈퇴 실패' });
  }
});



app.get('/book/bestseller', async (req, res) => {
  const response = await axios.get('https://www.aladin.co.kr/ttb/api/ItemList.aspx', {
    params: {
      ttbkey: process.env.ALADIN_TTB_KEY,
      QueryType: 'Bestseller',
      MaxResults: 10,
      start: 1,
      SearchTarget: 'Book',
      output: 'js',
      Version: '20131101',
      Cover: 'Big',
    },
  });

  const items = response.data.item ?? [];
  const books = items.map((item: any) => ({
    title: item.title,
    author: item.author,
    publisher: item.publisher,
    pubDate: item.pubDate,
    isbn13: item.isbn13,
    cover: item.cover ?? null,
    description: item.description ?? null,
    categoryName: item.categoryName ?? null,
  }));

  return res.status(200).json({ books });
});


// 책 검색
// Book Search
app.get('/book/search', async (req: Request, res: Response) => {
  const { query } = req.query;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'query 파라미터 필요' });
  }

  try {
    const response = await axios.get('https://www.aladin.co.kr/ttb/api/ItemSearch.aspx', {
      params: {
        ttbkey: process.env.ALADIN_TTB_KEY,
        Query: query,
        QueryType: 'Keyword',
        MaxResults: 10,
        start: 1,
        SearchTarget: 'Book',
        output: 'js',
        Version: '20131101',
        Cover: 'Big',
      },
    });

    const items = response.data.item ?? [];

    const books = items.map((item: any) => ({
      title: item.title,
      author: item.author,
      publisher: item.publisher,
      pubDate: item.pubDate,
      isbn13: item.isbn13,
      cover: item.cover ?? null,
      description: item.description ?? null,
      categoryName: item.categoryName ?? null,
    }));

    return res.status(200).json({ books });
  } catch (err) {
    console.error('❌ 알라딘 검색 실패:', err);
    return res.status(500).json({ error: '책 검색 실패' });
  }
});



app.post('/book/add', authenticate, async (req: Request, res: Response) => {
  try {
    const {
      title, author, publisher, pub_date,
      isbn13, cover_url, description, category_name,
      status, current_page, total_page,
    } = req.body;

    const { error } = await supabase
      .from('booklog_books')
      .insert({
        user_id: req.user!.dbUserId,
        title,
        author: author ?? null,
        publisher: publisher ?? null,
        pub_date: pub_date ?? null,
        isbn13: isbn13 ?? null,
        cover_url: cover_url ?? null,
        description: description ?? null,
        category_name: category_name ?? null,
        status: status ?? 'reading',
        current_page: current_page ?? 0,
        total_page: total_page ?? null,
      });

    if (error) throw error;

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ 책 등록 실패:', err);
    return res.status(500).json({ error: '책 등록 실패' });
  }
});



app.get('/book/list', authenticate, async (req: Request, res: Response) => {
  try {
    const { data: books, error } = await supabase
      .from('booklog_books')
      .select('*')
      .eq('user_id', req.user!.dbUserId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // 각 책의 대표 문장 조회
    const booksWithSentence = await Promise.all(
      (books ?? []).map(async (book) => {
        const { data: sentence } = await supabase
          .from('booklog_sentences')
          .select('content')
          .eq('book_id', book.id)
          .eq('is_representative', true)
          .maybeSingle();

        // 대표 문장 없으면 최신 문장으로 폴백
        if (!sentence) {
          const { data: latest } = await supabase
            .from('booklog_sentences')
            .select('content')
            .eq('book_id', book.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...book,
            representative_sentence: latest?.content ?? null,
          };
        }

        return {
          ...book,
          representative_sentence: sentence.content,
        };
      })
    );

    return res.status(200).json({ books: booksWithSentence });
  } catch (err) {
    console.error('❌ 책 목록 조회 실패:', err);
    return res.status(500).json({ error: '책 목록 조회 실패' });
  }
});


// 문장 관련 기능 추가
// POST /books/:bookId/sentences
app.post('/books/:bookId/sentences', authenticate, async (req: Request, res: Response) => {
  const { bookId } = req.params;
  const { content, pageNumber } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'content 누락' });
  }

  try {
    const { error } = await supabase
      .from('booklog_sentences')
      .insert({
        user_id: req.user!.dbUserId,
        book_id: bookId,
        content,
        page_number: pageNumber ?? null,
      });

    if (error) throw error;

    return res.status(201).json({ success: true });
  } catch (err) {
    console.error('❌ 문장 추가 실패:', err);
    return res.status(500).json({ error: '문장 추가 실패' });
  }
});


// GET /books/:bookId/sentences
app.get('/books/:bookId/sentences', authenticate, async (req: Request, res: Response) => {
  const { bookId } = req.params;

  try {
    const { data: sentences, error } = await supabase
      .from('booklog_sentences')
      .select('*')
      .eq('book_id', bookId)
      .eq('user_id', req.user!.dbUserId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json({ sentences });
  } catch (err) {
    console.error('❌ 문장 목록 조회 실패:', err);
    return res.status(500).json({ error: '문장 목록 조회 실패' });
  }

});


// 문장 수정
app.patch('/books/:bookId/sentences/:sentenceId/representative', authenticate, async (req: Request, res: Response) => {
  const { bookId, sentenceId } = req.params;

  try {
    // 기존 대표 문장 해제
    await supabase
      .from('booklog_sentences')
      .update({ is_representative: false })
      .eq('book_id', bookId)
      .eq('user_id', req.user!.dbUserId);

    // 새 대표 문장 설정
    const { error } = await supabase
      .from('booklog_sentences')
      .update({ is_representative: true })
      .eq('id', sentenceId)
      .eq('user_id', req.user!.dbUserId);

    if (error) throw error;

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ 대표 문장 설정 실패:', err);
    return res.status(500).json({ error: '대표 문장 설정 실패' });
  }
});


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app;
