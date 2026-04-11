import { Request, Response, NextFunction } from 'express';
import * as bookService from '../services/book.service';
import { AppError } from '../errors/AppError';

export async function getBestseller(req: Request, res: Response, next: NextFunction) {
  try {
    const books = await bookService.getBestseller();
    return res.status(200).json({ books });
  } catch (err) {
    return next(err);
  }
}

// 책 검색
export async function searchBook(req: Request, res: Response, next: NextFunction) {
  const { query } = req.query;

  if (!query || typeof query !== 'string') {
    return next(new AppError(400, 'query 파라미터 필요'));
  }

  try {
    const books = await bookService.searchBook(query);
    return res.status(200).json({ books });
  } catch (err) {
    console.error('❌ 알라딘 검색 실패:', err);
    return next(err);
  }
}

export async function addBook(req: Request, res: Response, next: NextFunction) {
  try {
    await bookService.addBook(req.user!.dbUserId, req.body);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ 책 등록 실패:', err);
    return next(err);
  }
}

export async function listBooks(req: Request, res: Response, next: NextFunction) {
  try {
    const books = await bookService.listBooksWithSentences(req.user!.dbUserId);
    return res.status(200).json({ books });
  } catch (err) {
    console.error('❌ 책 목록 조회 실패:', err);
    return next(err);
  }
}

// 문장 추가
export async function addSentence(req: Request, res: Response, next: NextFunction) {
  const { bookId } = req.params;
  const { content, pageNumber } = req.body;

  try {
    await bookService.addSentence(req.user!.dbUserId, bookId, content, pageNumber);
    return res.status(201).json({ success: true });
  } catch (err) {
    console.error('❌ 문장 추가 실패:', err);
    return next(err);
  }
}

// 문장 목록 조회
export async function getSentences(req: Request, res: Response, next: NextFunction) {
  const { bookId } = req.params;

  try {
    const sentences = await bookService.getSentences(req.user!.dbUserId, bookId);
    return res.status(200).json({ sentences });
  } catch (err) {
    console.error('❌ 문장 목록 조회 실패:', err);
    return next(err);
  }
}

// 대표 문장 설정
export async function setRepresentativeSentence(req: Request, res: Response, next: NextFunction) {
  const { bookId, sentenceId } = req.params;

  try {
    await bookService.setRepresentativeSentence(req.user!.dbUserId, bookId, sentenceId);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ 대표 문장 설정 실패:', err);
    return next(err);
  }
}
