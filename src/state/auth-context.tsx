import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import { authService } from '@/services/auth';
import { apiErrorMessage, ApiError } from '@/services/api/http-client';
import { AccountDeletionError, type AccountDeletionIdentity, type AuthService, type AuthUser } from '@/types/auth';

type AuthState = { status: 'loading' | 'ready' | 'error'; user: AuthUser | null; token: string | null; epoch: number; error: string | null };
type AuthContextValue = {
  state: AuthState;
  busy: boolean;
  refresh: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  deletionStatus: 'idle' | 'uncertain' | 'cleanup' | 'deleted' | 'unavailable';
  deleteAccount: () => Promise<void>;
  checkAccountDeletion: () => Promise<void>;
  service: AuthService;
  verificationEmail: string;
  setVerificationEmail: (email: string) => void;
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children, service = authService }: PropsWithChildren<{ service?: AuthService }>) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null, token: null, epoch: 0, error: null });
  const [busy, setBusy] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [deletionStatus, setDeletionStatus] = useState<AuthContextValue['deletionStatus']>('idle');
  const deletionIdentity = useRef<AccountDeletionIdentity | null>(null);
  const active = useRef(true);
  const version = useRef(0);
  const operation = useRef<Promise<void> | null>(null);
  const refresh = useCallback(async () => {
    if (operation.current) return;
    const request = ++version.current;
    try {
      const user = await service.restore();
      const token = user ? await service.getToken() : null;
      if (user && !token) throw new ApiError('response');
      if (active.current && request === version.current) setState(previous => ({ status: 'ready', user, token, epoch: previous.epoch + (previous.user?.id !== user?.id || previous.token !== token ? 1 : 0), error: null }));
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

  const changeSession = useCallback((work: () => Promise<AuthUser | null>, forceEpoch = true) => {
    if (operation.current) return operation.current;
    version.current += 1;
    setBusy(true);
    const pending = work().then(async (user) => {
      const token = user ? await service.getToken() : null;
      if (user && !token) throw new ApiError('response');
      if (active.current) setState(previous => ({ status: 'ready', user, token, epoch: previous.epoch + (forceEpoch || previous.user?.id !== user?.id || previous.token !== token ? 1 : 0), error: null }));
    }).finally(() => {
      operation.current = null;
      if (active.current) setBusy(false);
    });
    operation.current = pending;
    return pending;
  }, [service]);
  const signIn = useCallback((email: string, password: string) => changeSession(async () => { const user = await service.signIn(email, password); setDeletionStatus('idle'); deletionIdentity.current = null; return user; }), [changeSession, service]);
  const signOut = useCallback(() => changeSession(async () => { await service.signOut(); setDeletionStatus('idle'); deletionIdentity.current = null; return null; }), [changeSession, service]);
  const deletionFailure = useCallback((error: unknown) => {
    if (error instanceof AccountDeletionError) {
      setDeletionStatus(error.reason === 'cleanup' ? 'cleanup' : error.reason === 'changed' ? 'unavailable' : 'uncertain');
      // A confirmed server deletion must close the old game scope even if local cleanup fails.
      if (error.reason === 'cleanup') setState(previous => ({ status: 'ready', user: null, token: null, epoch: previous.epoch + 1, error: null }));
    }
    throw error;
  }, []);
  const deleteAccount = useCallback(() => changeSession(async () => {
    if (!state.user || !state.token) throw new ApiError('session');
    const identity = { userId: state.user.id, token: state.token }; deletionIdentity.current = identity;
    try { await service.deleteAccount(identity); setDeletionStatus('deleted'); setVerificationEmail(''); return null; }
    catch (error) { return deletionFailure(error); }
  }), [changeSession, state.user, state.token, service, deletionFailure]);
  const checkAccountDeletion = useCallback(() => changeSession(async () => {
    if (!deletionIdentity.current) throw new ApiError('session');
    try {
      const result = await service.checkAccountDeletion(deletionIdentity.current);
      setDeletionStatus(result.status === 'present' ? 'idle' : result.status);
      if (result.status === 'present') { deletionIdentity.current = null; return result.user; }
      setVerificationEmail(''); return null;
    } catch (error) { return deletionFailure(error); }
  }, false), [changeSession, service, deletionFailure]);
  const value = useMemo(() => ({ state, busy, refresh, signIn, signOut, deletionStatus, deleteAccount, checkAccountDeletion, service, verificationEmail, setVerificationEmail }), [state, busy, refresh, signIn, signOut, deletionStatus, deleteAccount, checkAccountDeletion, service, verificationEmail]);
  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
