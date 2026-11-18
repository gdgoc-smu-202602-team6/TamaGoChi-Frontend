import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { GameColors } from '@/constants/theme';
import { GuestbookBoard } from './guestbook-list';
import { useGuestbook } from './hooks/use-guestbook';
const target = { kind: 'mine' } as const;
export function GuestbookScreen() {
  const state = useGuestbook(target);
  return <SafeAreaView style={styles.screen}>
    <ScreenHeader title="내 방명록" onBack={() => router.dismissTo('/')} backLabel="내 방으로 돌아가기"
      actions={<IconButton icon="refresh" label="방명록 다시 확인" disabled={!!state.operation} onPress={() => { void state.refresh(); }} />} />
    <GuestbookBoard target={target} state={state} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: GameColors.sky } });
