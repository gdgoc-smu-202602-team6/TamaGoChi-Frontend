import { Redirect, router } from 'expo-router';
import { useState } from 'react';

import { GameButton } from '@/components/ui/game-button';
import { GameInput } from '@/components/ui/game-input';
import { AuthFrame, AuthMessage } from '@/features/auth/components/auth-frame';
import { useAuthAction } from '@/features/auth/hooks/use-auth-action';
import { useAuth } from '@/state/auth-context';
import { validateEmail, validateNewPassword, validateNickname } from '@/utils/auth-validation';

export function SignupScreen() {
  const auth = useAuth();
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const action = useAuthAction();
  const busy = action.pending || auth.state.status === 'loading';
  if (auth.state.status === 'ready' && auth.state.user) return <Redirect href="/account" />;
  async function submit() {
    const invalid = validateNickname(nickname) ?? validateEmail(email) ?? validateNewPassword(password);
    if (invalid) { action.setError(invalid); return; }
    const result = await action.run(() => auth.service.signUp({ nickname: nickname.trim(), email: email.trim(), password }));
    if (result.ok) { setPassword(''); auth.setVerificationEmail(email.trim()); router.replace('/verify-email'); }
  }
  return <AuthFrame title="함께 시작해요" subtitle="가입 후 이메일 인증을 완료해 주세요." tab="signup" busy={busy}>
    <GameInput label="닉네임" hint="1~10자 · 다른 사용자와 같아도 괜찮아요." value={nickname} onChangeText={setNickname} editable={!busy} autoComplete="nickname" textContentType="nickname" />
    <GameInput label="이메일" value={email} onChangeText={setEmail} editable={!busy} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" placeholder="name@example.com" />
    <GameInput label="비밀번호" hint="8~128자 · 영문, 숫자, 특수문자 포함" value={password} onChangeText={setPassword} editable={!busy} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" returnKeyType="go" onSubmitEditing={() => { if (!busy) void submit(); }} />
    {action.error && <AuthMessage error>{action.error}</AuthMessage>}
    <GameButton label={action.pending ? '가입 요청 중…' : '가입하고 인증 메일 받기'} disabled={busy} onPress={() => { void submit(); }} />
  </AuthFrame>;
}
