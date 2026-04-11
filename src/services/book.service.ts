import axios from 'axios';
import { supabase } from '../lib/supabase';

const ALADIN_BASE_PARAMS = {
  ttbkey: process.env.ALADIN_TTB_KEY,
  MaxResults: 10,
  start: 1,
  SearchTarget: 'Book',
  output: 'js',
  Version: '20131101',
  Cover: 'Big',
};

function mapAladinItem(item: any) {
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

export async function getBestseller(): Promise<object[]> {
  const response = await axios.get('https://www.aladin.co.kr/ttb/api/ItemList.aspx', {
    params: { ...ALADIN_BASE_PARAMS, QueryType: 'Bestseller' },
  });

  return (response.data.item ?? []).map(mapAladinItem);
}

export async function searchBook(query: string): Promise<object[]> {
  const response = await axios.get('https://www.aladin.co.kr/ttb/api/ItemSearch.aspx', {
    params: { ...ALADIN_BASE_PARAMS, Query: query, QueryType: 'Keyword' },
  });

  return (response.data.item ?? []).map(mapAladinItem);
}

export async function addBook(
  dbUserId: string,
  fields: {
    title: string;
    author?: string;
    publisher?: string;
    pub_date?: string;
    isbn13?: string;
    cover_url?: string;
    description?: string;
    category_name?: string;
    status?: string;
    current_page?: number;
    total_page?: number;
  }
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
    status: fields.status ?? 'reading',
    current_page: fields.current_page ?? 0,
    total_page: fields.total_page ?? null,
  });

  if (error) throw error;
}

export async function listBooksWithSentences(dbUserId: string): Promise<object[]> {
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

export async function getSentences(dbUserId: string, bookId: string): Promise<object[]> {
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
  await supabase
    .from('booklog_sentences')
    .update({ is_representative: false })
    .eq('book_id', bookId)
    .eq('user_id', dbUserId);

  const { error } = await supabase
    .from('booklog_sentences')
    .update({ is_representative: true })
    .eq('id', sentenceId)
    .eq('user_id', dbUserId);

  if (error) throw error;
}
