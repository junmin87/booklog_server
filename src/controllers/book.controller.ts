import { Request, Response } from 'express';
import axios from 'axios';
import { supabase } from '../lib/supabase';

export async function getBestseller(req: Request, res: Response) {
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
}

// 책 검색
export async function searchBook(req: Request, res: Response) {
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
}

export async function addBook(req: Request, res: Response) {
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
}

export async function listBooks(req: Request, res: Response) {
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
}

// 문장 추가
export async function addSentence(req: Request, res: Response) {
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
}

// 문장 목록 조회
export async function getSentences(req: Request, res: Response) {
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
}

// 대표 문장 설정
export async function setRepresentativeSentence(req: Request, res: Response) {
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
}
