import { Redirect, router } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';

import { GameButton } from '@/components/ui/game-button';
import { GameCard } from '@/components/ui/game-card';
import { GameScreen } from '@/components/ui/game-screen';
import { GameColors, GameUi } from '@/constants/theme';
import { AuthMessage } from '@/features/auth/components/auth-frame';
import { useAuthAction } from '@/features/auth/hooks/use-auth-action';
import { useAuth } from '@/state/auth-context';

export function AccountScreen() {
  const { state, signOut, busy, refresh } = useAuth();
  const action = useAuthAction();
  if (state.status === 'ready' && !state.user) return <Redirect href="/login" />;
  return <GameScreen title="내 계정" subtitle="내 계정 정보를 확인해요.">
    <GameCard>
      {state.status === 'loading' ? <ActivityIndicator accessibilityLabel="계정 확인 중" color={GameColors.ink} />
        : state.status === 'error' ? <>
          <AuthMessage error>{state.error}</AuthMessage>
          <GameButton label="계정 다시 확인" onPress={() => { void refresh(); }} />
        </> : state.user && <>
          <Text style={styles.title}>{state.user.nickname}님, 반가워요!</Text>
          <Text style={styles.body}>{state.user.email}</Text>
          <GameButton label={busy ? '로그아웃 중…' : '로그아웃'} disabled={busy || action.pending} onPress={() => { void action.run(signOut); }} />
        </>}
      {action.error && <AuthMessage error>{action.error}</AuthMessage>}
    </GameCard>
    <GameButton label="내 방 미리보기" variant="secondary" disabled={busy} onPress={() => router.dismissTo('/')} />
  </GameScreen>;
}

const styles = StyleSheet.create({
  title: { ...GameUi.typography.title, color: GameColors.ink },
  body: { ...GameUi.typography.body, color: GameColors.inkMuted },
});
