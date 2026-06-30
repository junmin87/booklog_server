import axios from 'axios';
import { supabase } from '../lib/supabase';
import { sql } from '../lib/postgres';
import { AppError } from '../errors/AppError';
import {
  AladinItem,
  AladinItemListResponse,
  BookSearchResult,
  BookWithRepresentativeSentence,
  AddBookInput,
  BookStatus,
  SentenceRow,
} from '../types';

// DEPRECATED: legacy values, remove after client rollout.
// Maps the old Flutter client's status values onto the current DB enum so only
// BOOK_STATUSES values are ever written. New values pass through unchanged.
const LEGACY_STATUS_ALIASES: Record<string, BookStatus> = {
  wish: 'want_to_read',
  want: 'want_to_read',
  done: 'completed',
};

function normalizeStatus(status: string): BookStatus {
  return LEGACY_STATUS_ALIASES[status] ?? (status as BookStatus);
}

const ALADIN_BASE_PARAMS = {
  ttbkey: process.env.ALADIN_TTB_KEY,
  MaxResults: 10,
  start: 1,
  SearchTarget: 'Book',
  output: 'js',
  Version: '20131101',
  Cover: 'Big',
};

function mapAladinItem(item: AladinItem): BookSearchResult {
  return {
    title: item.title,
    author: item.author,
    publisher: item.publisher,
    pubDate: item.pubDate,
    isbn13: item.isbn13,
    cover: item.cover ?? null,
    description: item.description ?? null,
    categoryName: item.categoryName ?? null,
  };
}

export async function getBestseller(): Promise<BookSearchResult[]> {
  const response = await axios.get<AladinItemListResponse>('https://www.aladin.co.kr/ttb/api/ItemList.aspx', {
    params: { ...ALADIN_BASE_PARAMS, QueryType: 'Bestseller' },
  });

  return (response.data.item ?? []).map(mapAladinItem);
}

export async function searchBook(query: string): Promise<BookSearchResult[]> {
  const response = await axios.get<AladinItemListResponse>('https://www.aladin.co.kr/ttb/api/ItemSearch.aspx', {
    params: { ...ALADIN_BASE_PARAMS, Query: query, QueryType: 'Keyword' },
  });

  return (response.data.item ?? []).map(mapAladinItem);
}

export async function addBook(
  dbUserId: string,
  fields: AddBookInput
): Promise<void> {
  const { error } = await supabase.from('booklog_books').insert({
    user_id: dbUserId,
    title: fields.title,
    author: fields.author ?? null,
    publisher: fields.publisher ?? null,
    pub_date: fields.pub_date ?? null,
    isbn13: fields.isbn13 ?? null,
    cover_url: fields.cover_url ?? null,
    description: fields.description ?? null,
    category_name: fields.category_name ?? null,
    status: fields.status ? normalizeStatus(fields.status) : 'reading',
    current_page: fields.current_page ?? 0,
    total_page: fields.total_page ?? null,
  });

  if (error) throw error;
}

export async function listBooksWithSentences(
  dbUserId: string
): Promise<BookWithRepresentativeSentence[]> {
  const { data: books, error } = await supabase
    .from('booklog_books')
    .select('*')
    .eq('user_id', dbUserId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return Promise.all(
    (books ?? []).map(async (book) => {
      const { data: sentence } = await supabase
        .from('booklog_sentences')
        .select('content')
        .eq('book_id', book.id)
        .eq('is_representative', true)
        .maybeSingle();

      if (!sentence) {
        const { data: latest } = await supabase
          .from('booklog_sentences')
          .select('content')
          .eq('book_id', book.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        return { ...book, representative_sentence: latest?.content ?? null };
      }

      return { ...book, representative_sentence: sentence.content };
    })
  );
}

export async function updateBookStatus(
  dbUserId: string,
  bookId: string,
  status: BookStatus
): Promise<void> {
  // DEPRECATED: legacy values, remove after client rollout.
  // Normalize at the entry point so only new enum values reach the DB.
  const normalizedStatus = normalizeStatus(status);

  // Scope the update by user_id so a user can only mutate their own book.
  // `.select()` lets us detect when nothing matched (missing book or not owned).
  const { data, error } = await supabase
    .from('booklog_books')
    .update({ status: normalizedStatus })
    .eq('id', bookId)
    .eq('user_id', dbUserId)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new AppError(404, '책을 찾을 수 없습니다');
}

export async function addSentence(
  dbUserId: string,
  bookId: string,
  content: string,
  pageNumber?: number
): Promise<void> {
  const { error } = await supabase.from('booklog_sentences').insert({
    user_id: dbUserId,
    book_id: bookId,
    content,
    page_number: pageNumber ?? null,
  });

  if (error) throw error;
}

export async function getSentences(dbUserId: string, bookId: string): Promise<SentenceRow[]> {
  const { data: sentences, error } = await supabase
    .from('booklog_sentences')
    .select('*')
    .eq('book_id', bookId)
    .eq('user_id', dbUserId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return sentences ?? [];
}

export async function setRepresentativeSentence(
  dbUserId: string,
  bookId: string,
  sentenceId: string
): Promise<void> {
  // Two writes that must be atomic: clear the existing representative flag for
  // the book, then set it on the chosen sentence. Run them inside a real
  // transaction so a failure can't leave the book with zero representatives.
  await sql.begin(async (tx) => {
    await tx`
      UPDATE booklog_sentences
      SET is_representative = false
      WHERE book_id = ${bookId} AND user_id = ${dbUserId}
    `;

    await tx`
      UPDATE booklog_sentences
      SET is_representative = true
      WHERE id = ${sentenceId} AND user_id = ${dbUserId}
    `;
  });
}
