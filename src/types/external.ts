// Shapes returned by third-party auth providers.

export interface AppleTokenResponse {
  refresh_token: string;
  access_token?: string;
  id_token?: string;
  expires_in?: number;
  token_type?: string;
}

export interface KakaoUserResponse {
  id: number;
  kakao_account?: {
    email?: string | null;
  };
}
