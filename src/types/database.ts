// Supabase table row / insert / update definitions.
// Mirrors the shape consumed across the services so the Supabase client can be
// strongly typed via the `Database` generic.
//
// These are declared as `type` aliases (not interfaces) so they carry an
// implicit index signature and satisfy Supabase's `GenericTable` constraint.

export type UserRow = {
  id: string;
  email: string | null;
  apple_user_id: string | null;
  kakao_user_id: string | null;
  apple_refresh_token: string | null;
  country_code: string | null;
  language_code: string | null;
  plan: string;
  fcm_token: string | null;
  last_login_at: string | null;
  deleted_at: string | null;
  created_at: string;
};

export type UserInsert = {
  id?: string;
  email?: string | null;
  apple_user_id?: string | null;
  kakao_user_id?: string | null;
  apple_refresh_token?: string | null;
  country_code?: string | null;
  language_code?: string | null;
  plan?: string;
  fcm_token?: string | null;
  last_login_at?: string | null;
  deleted_at?: string | null;
  created_at?: string;
};

export type UserUpdate = UserInsert;

export type BookRow = {
  id: string;
  user_id: string;
  title: string;
  author: string | null;
  publisher: string | null;
  pub_date: string | null;
  isbn13: string | null;
  cover_url: string | null;
  description: string | null;
  category_name: string | null;
  status: string;
  current_page: number;
  total_page: number | null;
  deleted_at: string | null;
  created_at: string;
};

export type BookInsert = {
  id?: string;
  user_id?: string;
  title?: string;
  author?: string | null;
  publisher?: string | null;
  pub_date?: string | null;
  isbn13?: string | null;
  cover_url?: string | null;
  description?: string | null;
  category_name?: string | null;
  status?: string;
  current_page?: number;
  total_page?: number | null;
  deleted_at?: string | null;
  created_at?: string;
};

export type BookUpdate = BookInsert;

export type SentenceRow = {
  id: string;
  user_id: string;
  book_id: string;
  content: string;
  page_number: number | null;
  is_representative: boolean;
  deleted_at: string | null;
  created_at: string;
};

export type SentenceInsert = {
  id?: string;
  user_id?: string;
  book_id?: string;
  content?: string;
  page_number?: number | null;
  is_representative?: boolean;
  deleted_at?: string | null;
  created_at?: string;
};

export type SentenceUpdate = SentenceInsert;

export interface Database {
  public: {
    Tables: {
      booklog_users: {
        Row: UserRow;
        Insert: UserInsert;
        Update: UserUpdate;
        Relationships: [];
      };
      booklog_books: {
        Row: BookRow;
        Insert: BookInsert;
        Update: BookUpdate;
        Relationships: [];
      };
      booklog_sentences: {
        Row: SentenceRow;
        Insert: SentenceInsert;
        Update: SentenceUpdate;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
