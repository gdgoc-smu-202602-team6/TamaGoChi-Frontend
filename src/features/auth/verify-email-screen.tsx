import { router } from 'expo-router';
import { useState } from 'react';

import { GameButton } from '@/components/ui/game-button';
import { GameInput } from '@/components/ui/game-input';
import { AuthFrame, AuthMessage } from '@/features/auth/components/auth-frame';
import { useAuthAction } from '@/features/auth/hooks/use-auth-action';
import { useAuth } from '@/state/auth-context';
import { validateEmail } from '@/utils/auth-validation';

export function VerifyEmailScreen() {
  const { service, verificationEmail } = useAuth();
  const [email, setEmail] = useState(verificationEmail);
  const [sent, setSent] = useState(false);
  const action = useAuthAction();
  async function resend() {
    const invalid = validateEmail(email);
    if (invalid) { action.setError(invalid); return; }
    setSent(false);
    if ((await action.run(() => service.sendVerification(email.trim()))).ok) setSent(true);
  }
  return <AuthFrame title="이메일을 확인해 주세요" subtitle="메일의 인증 링크를 연 뒤 돌아와 로그인해 주세요. 스팸함도 확인해 주세요.">
    <GameInput label="인증할 이메일" value={email} onChangeText={(value) => { setEmail(value); setSent(false); }} editable={!action.pending} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" />
    {sent && <AuthMessage>인증 메일을 요청했어요. 해당 주소로 가입했다면 받은 메일을 확인해 주세요.</AuthMessage>}
    {action.error && <AuthMessage error>{action.error}</AuthMessage>}
    <GameButton label={action.pending ? '메일 요청 중…' : '인증 메일 다시 받기'} disabled={action.pending} onPress={() => { void resend(); }} />
    <GameButton label="인증 후 로그인하기" variant="secondary" disabled={action.pending} onPress={() => router.replace('/login')} />
  </AuthFrame>;
}
