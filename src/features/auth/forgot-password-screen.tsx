import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';

import { GameButton } from '@/components/ui/game-button';
import { GameInput } from '@/components/ui/game-input';
import { authResetRedirectUrl } from '@/constants/api';
import { AuthFrame, AuthMessage } from '@/features/auth/components/auth-frame';
import { useAuthAction } from '@/features/auth/hooks/use-auth-action';
import { useAuth } from '@/state/auth-context';
import { validateEmail } from '@/utils/auth-validation';

export function ForgotPasswordScreen() {
  const { service } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const action = useAuthAction();
  async function submit() {
    const invalid = validateEmail(email);
    if (invalid) { action.setError(invalid); return; }
    setSent(false);
    const result = await action.run(() => service.requestPasswordReset(email.trim(), authResetRedirectUrl ?? Linking.createURL('/reset-password')));
    if (result.ok) setSent(true);
  }
  return <AuthFrame title="비밀번호를 잊었나요?" subtitle="가입한 이메일로 비밀번호 재설정 링크를 요청해요.">
    <GameInput label="이메일" value={email} onChangeText={(value) => { setEmail(value); setSent(false); }} editable={!action.pending} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" />
    {sent && <AuthMessage>해당 주소로 가입했다면 재설정 메일이 도착해요. 받은 편지함과 스팸함을 확인해 주세요.</AuthMessage>}
    {action.error && <AuthMessage error>{action.error}</AuthMessage>}
    <GameButton label={action.pending ? '메일 요청 중…' : '재설정 링크 받기'} disabled={action.pending} onPress={() => { void submit(); }} />
    <GameButton label="로그인으로" variant="secondary" disabled={action.pending} onPress={() => router.replace('/login')} />
  </AuthFrame>;
}
