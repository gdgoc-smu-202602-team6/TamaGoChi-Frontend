import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import { authService } from '@/services/auth';
import { apiErrorMessage } from '@/services/api/http-client';
import type { AuthService, AuthUser } from '@/types/auth';

type AuthState = { status: 'loading' | 'ready' | 'error'; user: AuthUser | null; error: string | null };
type AuthContextValue = {
  state: AuthState;
  busy: boolean;
  refresh: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  service: AuthService;
  verificationEmail: string;
  setVerificationEmail: (email: string) => void;
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children, service = authService }: PropsWithChildren<{ service?: AuthService }>) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null, error: null });
  const [busy, setBusy] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const active = useRef(true);
  const version = useRef(0);
  const operation = useRef<Promise<void> | null>(null);
  const refresh = useCallback(async () => {
    if (operation.current) return;
    const request = ++version.current;
    try {
      const user = await service.restore();
      if (active.current && request === version.current) setState({ status: 'ready', user, error: null });
    } catch (error) {
      if (active.current && request === version.current) setState((previous) => ({ ...previous, status: 'error', error: apiErrorMessage(error) }));
    }
  }, [service]);

  useEffect(() => {
    active.current = true;
    void refresh();
    const subscription = AppState.addEventListener('change', (status) => { if (status === 'active') void refresh(); });
    return () => { active.current = false; version.current += 1; subscription.remove(); };
  }, [refresh]);

  const changeSession = useCallback((work: () => Promise<AuthUser | null>) => {
    if (operation.current) return operation.current;
    version.current += 1;
    setBusy(true);
    const pending = work().then((user) => {
      if (active.current) setState({ status: 'ready', user, error: null });
    }).finally(() => {
      operation.current = null;
      if (active.current) setBusy(false);
    });
    operation.current = pending;
    return pending;
  }, []);
  const signIn = useCallback((email: string, password: string) => changeSession(() => service.signIn(email, password)), [changeSession, service]);
  const signOut = useCallback(() => changeSession(async () => { await service.signOut(); return null; }), [changeSession, service]);
  const value = useMemo(() => ({ state, busy, refresh, signIn, signOut, service, verificationEmail, setVerificationEmail }), [state, busy, refresh, signIn, signOut, service, verificationEmail]);
  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
