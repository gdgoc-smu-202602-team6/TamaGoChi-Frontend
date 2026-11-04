import { router, usePreventRemove } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GameButton } from '@/components/ui/game-button';
import { GameConfirmDialog } from '@/components/ui/game-confirm-dialog';
import { GameColors, GameUi } from '@/constants/theme';

export function SettingsFrame({ title, saving, dirty, operation, error, notice, onRefresh, children }: { title: string; saving: boolean; dirty: boolean; operation: string | null; error: string | null; notice: string | null; onRefresh: () => void; children: ReactNode }) {
  const [prompt, setPrompt] = useState(false), [allowLeave, setAllowLeave] = useState(false), action = useRef<(() => void) | null>(null);
  const stop = usePreventRemove(!allowLeave && (saving || dirty), ({ repeat }) => { if (!saving) { action.current = repeat; setPrompt(true); } });
  return <SafeAreaView style={styles.screen}><KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <GameButton compact variant="secondary" label="◀ 마이" accessibilityLabel="마이로 돌아가기" disabled={saving || prompt} onPress={() => router.dismissTo('/mypage')} /><Text accessibilityRole="header" style={styles.title}>{title}</Text>
    {operation && <ActivityIndicator accessibilityLabel="설정 확인 중" color={GameColors.ink} />}{error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}{notice && <Text accessibilityLiveRegion="polite" style={styles.body}>{notice}</Text>}
    <GameButton compact variant="secondary" label="설정 다시 확인" disabled={!!operation || prompt} onPress={onRefresh} />{children}
  </ScrollView></KeyboardAvoidingView><GameConfirmDialog visible={prompt} title="설정 화면을 나갈까요?" message="입력 중인 내용은 임시 저장되지 않아요." confirmLabel="변경 버리고 나가기" onConfirm={() => { setAllowLeave(true); stop(); setPrompt(false); action.current?.(); }} onCancel={() => { setPrompt(false); action.current = null; }} /></SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: GameColors.sky }, content: { width: '100%', maxWidth: GameUi.contentWidth, alignSelf: 'center', flexGrow: 1, padding: 18, gap: 12 }, title: { ...GameUi.typography.title, color: GameColors.ink }, body: { ...GameUi.typography.body, color: GameColors.ink }, error: { ...GameUi.typography.body, color: GameColors.coral } });
