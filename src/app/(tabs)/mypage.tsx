import { router } from 'expo-router';
import { Text } from 'react-native';

import { GameButton } from '@/components/ui/game-button';
import { GameCard } from '@/components/ui/game-card';
import { GameScreen } from '@/components/ui/game-screen';
import { GameColors, GameUi } from '@/constants/theme';
import { useAuth } from '@/state/auth-context';

export default function MyPageScreen() {
  const { state } = useAuth();
  return <GameScreen title="마이" subtitle="내 계정을 확인해요.">
    <GameCard>
      <Text style={{ ...GameUi.typography.body, color: GameColors.ink }}>로그인하고 계정 정보를 확인할 수 있어요.</Text>
      <GameButton label={state.user ? '내 계정' : '이메일로 로그인'} onPress={() => router.push(state.user ? '/account' : '/login')} />
    </GameCard>
  </GameScreen>;
}
