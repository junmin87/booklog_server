// Aladin (알라딘) Open API response shapes and the mapped book result.

export interface AladinItem {
  title: string;
  author: string;
  publisher: string;
  pubDate: string;
  isbn13: string;
  cover?: string;
  description?: string;
  categoryName?: string;
}

export interface AladinItemListResponse {
  item?: AladinItem[];
}

export interface BookSearchResult {
  title: string;
  author: string;
  publisher: string;
  pubDate: string;
  isbn13: string;
  cover: string | null;
  description: string | null;
  categoryName: string | null;
}
