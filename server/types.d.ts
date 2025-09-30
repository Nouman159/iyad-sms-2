declare global {
  namespace Express {
    interface User {
      claims?: {
        sub: string;
        email: string;
        first_name: string;
        last_name: string;
      };
      expires_at?: number;
      access_token?: string;
      refresh_token?: string;
    }
  }
}

export {};