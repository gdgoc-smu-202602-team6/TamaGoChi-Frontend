import { Redirect } from 'expo-router';
import { useSyncExternalStore, type PropsWithChildren } from 'react';
import { ActivityIndicator, Text } from 'react-native';

import { GameButton } from '@/components/ui/game-button';
import { GameCard } from '@/components/ui/game-card';
import { GameScreen } from '@/components/ui/game-screen';
import { isMockMode } from '@/constants/api';
import { GameColors } from '@/constants/theme';
import { useAuth } from '@/state/auth-context';

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function RequireAuth({ children }: PropsWithChildren) {
  const { state, refresh } = useAuth();
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  // Web tab navigation reads browser state. Keep its first render identical to SSR in preview mode too.
  if (isMockMode && !hydrated) return <GameScreen title="내 방" subtitle="내 방을 준비하고 있어요."><ActivityIndicator color={GameColors.ink} /></GameScreen>;
  if (isMockMode) return children;
  if (state.status !== 'ready') return <GameScreen title="로그인" subtitle="내 계정을 확인해요."><GameCard>
    {state.status === 'loading' ? <ActivityIndicator color={GameColors.ink} accessibilityLabel="로그인 확인 중" /> : <>
      <Text accessibilityRole="alert">{state.error}</Text>
      <GameButton label="로그인 다시 확인" onPress={() => { void refresh(); }} />
    </>}
  </GameCard></GameScreen>;
  if (!state.user) return <Redirect href="/login" />;
  return children;
}
