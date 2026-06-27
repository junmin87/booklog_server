// Request / response DTOs exchanged over the HTTP layer.

import { BookRow, SentenceRow, BookStatus } from './database';
import { BookSearchResult } from './aladin';

// ---- Request bodies ----

export interface AppleLoginBody {
  identityToken?: string;
  userIdentifier: string;
  email?: string | null;
  authorizationCode?: string;
}

export interface AppleRevokeBody {
  refreshToken: string;
}

export interface KakaoLoginBody {
  accessToken: string;
}

export interface UpdateCountryBody {
  country_code: string;
  language_code: string;
}

export interface UpdateFcmTokenBody {
  fcm_token: string;
}

export interface AddBookInput {
  title: string;
  author?: string;
  publisher?: string;
  pub_date?: string;
  isbn13?: string;
  cover_url?: string;
  description?: string;
  category_name?: string;
  status?: BookStatus;
  current_page?: number;
  total_page?: number;
}

export interface AddSentenceBody {
  content: string;
  pageNumber?: number;
}

export interface UpdateBookStatusBody {
  status: BookStatus;
}

export interface SendPushBody {
  title?: string;
  content?: string;
  topic?: string;
}

// ---- Route params ----
// The index signature keeps these compatible with Express's `ParamsDictionary`
// so typed handlers can still be registered on a router.

export interface BookIdParams {
  bookId: string;
  [key: string]: string;
}

export interface SentenceParams {
  bookId: string;
  sentenceId: string;
  [key: string]: string;
}

// ---- Response bodies ----

export interface SuccessResponse {
  success: boolean;
}

export interface MessageResponse {
  message: string;
}

export interface ValidateTokenResponse {
  valid: boolean;
  userId: string;
  email: string | null;
  snsType: string;
  country_code: string | null;
}

export interface LoginResponse {
  serverToken: string;
  refreshToken?: string;
  country_code: string | null;
}

export interface UserProfileResponse {
  id: string;
  email: string | null;
  countryCode: string | null;
  languageCode: string | null;
  plan: string;
  snsType: string;
  snsId: string;
}

export interface BookWithRepresentativeSentence extends BookRow {
  representative_sentence: string | null;
}

export interface BookListResponse {
  books: BookWithRepresentativeSentence[];
}

export interface BookSearchResponse {
  books: BookSearchResult[];
}

export interface SentenceListResponse {
  sentences: SentenceRow[];
}

export interface PushResponse {
  success: boolean;
  result: string;
}
