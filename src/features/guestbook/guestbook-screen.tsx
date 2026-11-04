import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/ui/screen-header';
import { GameColors } from '@/constants/theme';
import { GuestbookList } from './guestbook-list';
const target = { kind: 'mine' } as const;
export function GuestbookScreen() { return <SafeAreaView style={styles.screen}><ScreenHeader title="내 방명록" onBack={() => router.dismissTo('/')} backLabel="내 방으로 돌아가기" /><GuestbookList target={target} /></SafeAreaView>; }
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: GameColors.sky } });
