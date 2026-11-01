import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { GameButton } from '@/components/ui/game-button';
import { GameInput } from '@/components/ui/game-input';
import { AuthFrame, AuthMessage } from '@/features/auth/components/auth-frame';
import { useAuthAction } from '@/features/auth/hooks/use-auth-action';
import { useAuth } from '@/state/auth-context';
import { validateNewPassword } from '@/utils/auth-validation';

export function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string | string[]; error?: string | string[] }>();
  const token = typeof params.token === 'string' && params.token.length <= 4096 && !params.error ? params.token : '';
  return <ResetPasswordForm key={token || 'invalid'} token={token} />;
}

function ResetPasswordForm({ token }: { token: string }) {
  const { service } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [done, setDone] = useState(false);
  const action = useAuthAction();
  async function submit() {
    if (!token) return;
    const invalid = validateNewPassword(password) ?? (password !== confirmation ? '두 비밀번호가 같지 않아요.' : null);
    if (invalid) { action.setError(invalid); return; }
    if ((await action.run(() => service.resetPassword(token, password))).ok) { setPassword(''); setConfirmation(''); setDone(true); }
  }
  return <AuthFrame title="새 비밀번호 설정" subtitle="메일에서 받은 링크로 비밀번호를 바꿔요.">
    {done ? <>
      <AuthMessage>비밀번호를 바꿨어요. 새 비밀번호로 로그인해 주세요.</AuthMessage>
      <GameButton label="로그인으로" onPress={() => router.replace('/login')} />
    </> : !token ? <>
      <AuthMessage error>링크가 올바르지 않거나 만료되었어요. 새 링크를 요청해 주세요.</AuthMessage>
      <GameButton label="새 재설정 링크 받기" onPress={() => router.replace('/forgot-password')} />
    </> : <>
      <GameInput label="새 비밀번호" hint="8~128자 · 영문, 숫자, 특수문자 포함" value={password} onChangeText={setPassword} editable={!action.pending} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" />
      <GameInput label="새 비밀번호 확인" value={confirmation} onChangeText={setConfirmation} editable={!action.pending} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" returnKeyType="go" onSubmitEditing={() => { if (!action.pending) void submit(); }} />
      {action.error && <AuthMessage error>{action.error}</AuthMessage>}
      <GameButton label={action.pending ? '변경 중…' : '비밀번호 바꾸기'} disabled={action.pending} onPress={() => { void submit(); }} />
    </>}
  </AuthFrame>;
}
