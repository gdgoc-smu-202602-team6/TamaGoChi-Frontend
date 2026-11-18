import { router } from 'expo-router';
import { GameButton } from '@/components/ui/game-button';
import { GameCard } from '@/components/ui/game-card';
import { GameScreen } from '@/components/ui/game-screen';
import { useStudy } from '@/state/study-context';
import { AppBlockingNotice } from './components/app-blocking-notice';

export function AppBlockingScreen() {
  const { state, operation } = useStudy();
  return <GameScreen title="앱 차단 안내" onBack={() => router.dismissTo('/mypage')} backLabel="마이로 돌아가기" backDisabled={!!operation}>
    <GameCard><AppBlockingNotice /></GameCard>
    {state.status === 'ready' && state.session && <GameButton label="진행 중인 공부로" disabled={!!operation} onPress={() => router.dismissTo('/study')} />}
  </GameScreen>;
}
