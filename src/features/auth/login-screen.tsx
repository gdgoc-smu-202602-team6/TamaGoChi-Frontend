import { Redirect, router } from 'expo-router';
import { useState } from 'react';

import { GameButton } from '@/components/ui/game-button';
import { GameInput } from '@/components/ui/game-input';
import { AuthFrame, AuthMessage } from '@/features/auth/components/auth-frame';
import { useAuthAction } from '@/features/auth/hooks/use-auth-action';
import { ApiError } from '@/services/api/http-client';
import { useAuth } from '@/state/auth-context';
import { validateEmail } from '@/utils/auth-validation';

export function LoginScreen() {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const action = useAuthAction();
  const busy = action.pending || auth.busy || auth.state.status === 'loading';
  if (auth.state.status === 'ready' && auth.state.user) return <Redirect href="/account" />;

  async function submit() {
    const invalid = validateEmail(email) ?? (!password ? '비밀번호를 입력해 주세요.' : null);
    if (invalid) { action.setError(invalid); return; }
    setNeedsVerification(false);
    const result = await action.run(() => auth.signIn(email.trim(), password));
    if (result.ok) { setPassword(''); router.replace('/account'); }
    else if (result.reason instanceof ApiError && result.reason.code === 'EMAIL_NOT_VERIFIED') setNeedsVerification(true);
  }
  return <AuthFrame title="반가워요!" subtitle="이메일로 로그인하고 내 계정을 확인해요." tab="login" busy={busy}>
    <GameInput label="이메일" value={email} onChangeText={setEmail} editable={!busy} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" placeholder="name@example.com" />
    <GameInput label="비밀번호" value={password} onChangeText={setPassword} editable={!busy} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="current-password" textContentType="password" returnKeyType="go" onSubmitEditing={() => { if (!busy) void submit(); }} />
    {action.error && <AuthMessage error>{action.error}</AuthMessage>}
    {needsVerification && <GameButton label="인증 메일 확인" variant="secondary" disabled={busy} onPress={() => { auth.setVerificationEmail(email.trim()); router.push('/verify-email'); }} />}
    <GameButton label={busy ? '로그인 확인 중…' : '로그인'} disabled={busy} onPress={() => { void submit(); }} />
    <GameButton label="비밀번호를 잊었어요" compact variant="secondary" disabled={busy} onPress={() => router.push('/forgot-password')} />
    <GameButton label="내 방 미리보기" compact variant="secondary" disabled={busy} onPress={() => router.dismissTo('/')} />
  </AuthFrame>;
}
