export type AuthUser = {
  readonly id: string;
  readonly email: string;
  readonly nickname: string;
};

export type SignUpInput = {
  readonly nickname: string;
  readonly email: string;
  readonly password: string;
};

export type TokenStore = {
  get: () => Promise<string | null>;
  set: (token: string) => Promise<void>;
  remove: () => Promise<void>;
};

export type AuthService = {
  getToken: () => Promise<string | null>;
  restore: () => Promise<AuthUser | null>;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  sendVerification: (email: string) => Promise<void>;
  requestPasswordReset: (email: string, redirectTo: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
};
