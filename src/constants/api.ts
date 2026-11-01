export const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.tmgoc.kro.kr';

// Configured by the team after the backend allows this exact web origin / mobile scheme.
export const authResetRedirectUrl = process.env.EXPO_PUBLIC_AUTH_RESET_REDIRECT_URL;

// SecureStore permits alphanumerics, '.', '-', '_'. Hex keeps different backend URLs isolated.
export const authTokenKey = `tamagochi.auth.v1.${Array.from(apiBaseUrl.replace(/\/$/, '')).map((character) => character.codePointAt(0)!.toString(16)).join('-')}`;
