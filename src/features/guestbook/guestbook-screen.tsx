import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GameButton } from '@/components/ui/game-button';
import { GameColors } from '@/constants/theme';
import { GuestbookList } from './guestbook-list';
const target = { kind: 'mine' } as const;
export function GuestbookScreen() { return <SafeAreaView style={styles.screen}><GuestbookList target={target} header={<GameButton compact variant="secondary" label="◀ 내 방" onPress={() => router.dismissTo('/')} />} /></SafeAreaView>; }
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: GameColors.sky } });
