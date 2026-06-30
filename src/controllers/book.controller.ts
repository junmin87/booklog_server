import { Request, Response, NextFunction } from 'express';
import * as bookService from '../services/book.service';
import { AppError } from '../errors/AppError';
import { sendSuccess } from '../utils/response';
import {
  AddBookInput,
  AddSentenceBody,
  UpdateBookStatusBody,
  BookIdParams,
  SentenceParams,
  BookListResponse,
  BookSearchResponse,
  SentenceListResponse,
  SuccessResponse,
} from '../types';

export async function getBestseller(req: Request, res: Response<BookSearchResponse>, next: NextFunction) {
  try {
    const books = await bookService.getBestseller();
    return sendSuccess(res, { books });
  } catch (err) {
    return next(err);
  }
}

// 책 검색
export async function searchBook(req: Request, res: Response<BookSearchResponse>, next: NextFunction) {
  const { query } = req.query;

  if (!query || typeof query !== 'string') {
    return next(new AppError(400, 'query 파라미터 필요'));
  }

  try {
    const books = await bookService.searchBook(query);
    return sendSuccess(res, { books });
  } catch (err) {
    console.error('❌ 알라딘 검색 실패:', err);
    return next(err);
  }
}

export async function addBook(
  req: Request<Record<string, never>, SuccessResponse, AddBookInput>,
  res: Response<SuccessResponse>,
  next: NextFunction
) {
  try {
    await bookService.addBook(req.user!.dbUserId, req.body);
    return sendSuccess(res, null);
  } catch (err) {
    console.error('❌ 책 등록 실패:', err);
    return next(err);
  }
}

export async function listBooks(req: Request, res: Response<BookListResponse>, next: NextFunction) {
  try {
    const books = await bookService.listBooksWithSentences(req.user!.dbUserId);
    return sendSuccess(res, { books });
  } catch (err) {
    console.error('❌ 책 목록 조회 실패:', err);
    return next(err);
  }
}

// 책 상태 변경
export async function updateBookStatus(
  req: Request<BookIdParams, SuccessResponse, UpdateBookStatusBody>,
  res: Response<SuccessResponse>,
  next: NextFunction
) {
  const { bookId } = req.params;
  const { status } = req.body;

  try {
    await bookService.updateBookStatus(req.user!.dbUserId, bookId, status);
    return sendSuccess(res, null);
  } catch (err) {
    console.error('❌ 책 상태 변경 실패:', err);
    return next(err);
  }
}

// 문장 추가
export async function addSentence(
  req: Request<BookIdParams, SuccessResponse, AddSentenceBody>,
  res: Response<SuccessResponse>,
  next: NextFunction
) {
  const { bookId } = req.params;
  const { content, pageNumber } = req.body;

  try {
    await bookService.addSentence(req.user!.dbUserId, bookId, content, pageNumber);
    return sendSuccess(res, null, 201);
  } catch (err) {
    console.error('❌ 문장 추가 실패:', err);
    return next(err);
  }
}

// 문장 목록 조회
export async function getSentences(
  req: Request<BookIdParams>,
  res: Response<SentenceListResponse>,
  next: NextFunction
) {
  const { bookId } = req.params;

  try {
    const sentences = await bookService.getSentences(req.user!.dbUserId, bookId);
    return sendSuccess(res, { sentences });
  } catch (err) {
    console.error('❌ 문장 목록 조회 실패:', err);
    return next(err);
  }
}

// 대표 문장 설정
export async function setRepresentativeSentence(
  req: Request<SentenceParams>,
  res: Response<SuccessResponse>,
  next: NextFunction
) {
  const { bookId, sentenceId } = req.params;

  try {
    await bookService.setRepresentativeSentence(req.user!.dbUserId, bookId, sentenceId);
    return sendSuccess(res, null);
  } catch (err) {
    console.error('❌ 대표 문장 설정 실패:', err);
    return next(err);
  }
}
