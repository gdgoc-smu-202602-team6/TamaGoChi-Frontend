import { useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GameButton } from '@/components/ui/game-button';
import { GameCard } from '@/components/ui/game-card';
import { GameColorPicker } from '@/components/ui/game-color-picker';
import { GameConfirmDialog } from '@/components/ui/game-confirm-dialog';
import { GameInput } from '@/components/ui/game-input';
import { Palette } from '@/constants/palette';
import { GameColors, GameUi, Spacing } from '@/constants/theme';
import type { ClubPart } from '@/types/club-join';
import { noticeCharacterCount } from '@/utils/notice-compose';
import { useClubParts } from './hooks/use-club-parts';

export function ClubPartsScreen({ clubId }: { clubId: string }) {
  const manager = useClubParts(clubId);
  return <PartsContent key={manager.board ? 'loaded' : 'unavailable'} manager={manager} />;
}
function PartsContent({ manager }: { manager: ReturnType<typeof useClubParts> }) {
  const [target, setTarget] = useState<ClubPart | null>(null), board = manager.board, disabled = !!manager.operation || !manager.verified || !!target;
  return <SafeAreaView style={styles.screen}>
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <FlatList style={styles.list} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" data={board ? board.parts : []} keyExtractor={item => item.id}
        ListHeaderComponent={<View style={styles.header}>
          <View style={styles.heading}><GameButton compact variant="secondary" label="◀ 공지" disabled={!!manager.operation || !!target} onPress={() => { void manager.openList(); }} /><Text accessibilityRole="header" style={styles.title}>파트 관리</Text></View>
          {board && <Text style={styles.body}>{board.club.name} · 파트 {board.parts.length}개</Text>}
          {manager.operation && <ActivityIndicator accessibilityLabel="파트 확인 중" color={GameColors.ink} />}
          {manager.error && <Text accessibilityRole="alert" style={styles.error}>{manager.error}</Text>}
          {manager.notice && <Text accessibilityLiveRegion="polite" style={styles.notice}>{manager.notice}</Text>}
          <GameButton compact variant="secondary" label="파트 목록 다시 확인" disabled={!!manager.operation || !!target} onPress={() => { void manager.refresh(); }} />
          {board && <GameCard><Text accessibilityRole="header" style={styles.title}>새 파트</Text>
            <GameInput label="파트 이름" hint={`${noticeCharacterCount(manager.name) ?? '—'}/10자`} value={manager.name} editable={!disabled} onChangeText={manager.changeName} />
            <GameColorPicker label="파트" value={manager.color} disabled={disabled} onChange={manager.changeColor} />
            <GameButton label="파트 추가" disabled={disabled} onPress={() => { void manager.mutate({ kind: 'add', name: manager.name, color: manager.color }); }} />
          </GameCard>}
          {board && <Text style={styles.caption}>부원 소속이나 승인 대기 신청에서 쓰는 파트는 삭제할 수 없어요.</Text>}
        </View>}
        renderItem={({ item }) => <GameCard style={styles.item}><View style={styles.heading}>
          <Text accessibilityRole="header" style={[styles.badge, { backgroundColor: Palette[item.color].background, color: Palette[item.color].text }]}>{item.name}</Text>
          <GameButton compact variant="secondary" label="삭제" accessibilityLabel={`${item.name} 파트 삭제`} disabled={disabled} onPress={() => setTarget(item)} />
        </View></GameCard>}
        ListEmptyComponent={board ? <Text style={styles.body}>등록된 파트가 없어요.</Text> : undefined}
        ListFooterComponent={<GameButton variant="secondary" label="공지 목록으로" disabled={!!manager.operation || !!target} onPress={() => { void manager.openList(); }} />}
      />
    </KeyboardAvoidingView>
    <GameConfirmDialog visible={!!target && !!board} title="파트를 삭제할까요?" message={`${target?.name ?? ''}\n\n부원이나 승인 대기 신청에서 사용하는 파트는 삭제할 수 없어요.`} confirmLabel="파트 삭제 확인" confirmDisabled={!!manager.operation || !manager.verified} onConfirm={() => { const part = target; setTarget(null); if (part) void manager.mutate({ kind: 'delete', part }); }} onCancel={() => setTarget(null)} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: GameColors.sky }, list: { width: '100%', maxWidth: GameUi.contentWidth, alignSelf: 'center' }, content: { flexGrow: 1, padding: 18, paddingBottom: Spacing.four },
  header: { gap: Spacing.three, marginBottom: Spacing.three }, heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 }, title: { ...GameUi.typography.title, color: GameColors.ink }, body: { ...GameUi.typography.body, color: GameColors.ink },
  caption: { ...GameUi.typography.caption, color: GameColors.inkMuted }, error: { ...GameUi.typography.body, color: GameColors.coral }, notice: { ...GameUi.typography.body, color: GameColors.ink, padding: 12, backgroundColor: GameColors.cream, borderRadius: 12 },
  item: { marginBottom: Spacing.three }, badge: { ...GameUi.typography.title, flex: 1, padding: 12, borderWidth: 2, borderColor: GameColors.ink, borderRadius: 14 },
});
