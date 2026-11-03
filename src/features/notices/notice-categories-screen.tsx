import { router } from 'expo-router';
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
import type { CategoryAction } from '@/types/notice-categories';
import { noticeCharacterCount } from '@/utils/notice-compose';
import { useCategoryManager } from './hooks/use-category-manager';

export function NoticeCategoriesScreen({ clubId }: { clubId: string }) {
  const manager = useCategoryManager(clubId);
  return <CategoryContent key={manager.board ? 'loaded' : 'unavailable'} manager={manager} />;
}
function CategoryContent({ manager }: { manager: ReturnType<typeof useCategoryManager> }) {
  const [target, setTarget] = useState<Extract<CategoryAction, { kind: 'delete-category' | 'delete-subcategory' }> | null>(null);
  const board = manager.board, disabled = !!manager.operation || !manager.verified || !!target;
  const targetName = target?.kind === 'delete-category' ? target.category.name : target?.subcategory.name;
  return <SafeAreaView style={styles.screen}>
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <FlatList style={styles.list} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" data={board ? board.categories : []} keyExtractor={item => item.id}
        ListHeaderComponent={<View style={styles.header}>
          <View style={styles.heading}><GameButton compact variant="secondary" label="◀ 공지" disabled={!!manager.operation || !!target} onPress={() => router.dismissTo('/notice')} /><Text accessibilityRole="header" style={styles.title}>공지 분류 관리</Text></View>
          {board && <Text style={styles.body}>{board.club.name}</Text>}
          {manager.operation && <ActivityIndicator color={GameColors.ink} accessibilityLabel="공지 분류 확인 중" />}
          {manager.error && <Text accessibilityRole="alert" style={styles.error}>{manager.error}</Text>}
          {manager.notice && <Text accessibilityLiveRegion="polite" style={styles.notice}>{manager.notice}</Text>}
          <GameButton compact variant="secondary" label="분류 목록 다시 확인" disabled={!!manager.operation || !!target} onPress={() => { void manager.refresh(); }} />
          {board && <GameCard contentStyle={styles.form}>
            <Text accessibilityRole="header" style={styles.title}>새 분류</Text>
            <GameInput label="분류 이름" hint={`${noticeCharacterCount(manager.name) ?? '—'}/10자`} value={manager.name} onChangeText={manager.changeName} editable={!disabled} />
            <GameColorPicker label="분류" value={manager.color} disabled={disabled} onChange={manager.changeColor} />
            <GameButton label="분류 추가" disabled={disabled} onPress={() => { void manager.mutate({ kind: 'add-category', name: manager.name, color: manager.color }); }} />
          </GameCard>}
        </View>}
        renderItem={({ item }) => <GameCard style={styles.item}>
          <View style={styles.heading}><Text accessibilityRole="header" style={[styles.badge, { backgroundColor: Palette[item.color].background, color: Palette[item.color].text }]}>{item.name}</Text>
            {!item.preset && <GameButton compact variant="secondary" label="삭제" accessibilityLabel={`${item.name} 분류 삭제`} disabled={disabled} onPress={() => setTarget({ kind: 'delete-category', category: item })} />}
          </View>
          {item.preset && <Text style={styles.caption}>기본 분류 · 삭제할 수 없어요.</Text>}
          {item.subcategories.map(sub => <View key={sub.id} style={styles.sub}><Text style={styles.subName}>{sub.name}</Text><GameButton compact variant="secondary" label="삭제" accessibilityLabel={`${item.name} ${sub.name} 세부 분류 삭제`} disabled={disabled} onPress={() => setTarget({ kind: 'delete-subcategory', categoryId: item.id, subcategory: sub })} /></View>)}
          {!item.subcategories.length && <Text style={styles.caption}>등록된 세부 분류가 없어요.</Text>}
          <GameInput label={`${item.name} 세부 분류 이름`} hint="1~10자 · 이 분류 안에서 중복 없이 입력해 주세요." value={manager.subNames[item.id] ?? ''} onChangeText={value => manager.changeSubName(item.id, value)} editable={!disabled} />
          <GameButton compact label="세부 분류 추가" accessibilityLabel={`${item.name} 세부 분류 추가`} disabled={disabled} onPress={() => { void manager.mutate({ kind: 'add-subcategory', categoryId: item.id, name: manager.subNames[item.id] ?? '' }); }} />
        </GameCard>}
        ListFooterComponent={<GameButton variant="secondary" label="공지 목록으로" disabled={!!manager.operation || !!target} onPress={() => { void manager.openList(); }} />}
      />
    </KeyboardAvoidingView>
    <GameConfirmDialog visible={!!target && !!board} title="분류를 삭제할까요?" message={`${targetName ?? ''}\n\n${target?.kind === 'delete-category' ? '이 분류의 세부 분류도 함께 삭제해요. ' : ''}공지에서 사용 중이면 삭제할 수 없어요.`} confirmLabel="분류 삭제 확인" confirmDisabled={!!manager.operation || !manager.verified} onConfirm={() => { const action = target; setTarget(null); if (action) void manager.mutate(action); }} onCancel={() => setTarget(null)} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: GameColors.sky }, list: { width: '100%', maxWidth: GameUi.contentWidth, alignSelf: 'center' }, content: { flexGrow: 1, padding: 18, paddingBottom: Spacing.four },
  header: { gap: Spacing.three, marginBottom: Spacing.three }, heading: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 }, title: { ...GameUi.typography.title, color: GameColors.ink },
  body: { ...GameUi.typography.body, color: GameColors.ink }, caption: { ...GameUi.typography.caption, color: GameColors.inkMuted }, error: { ...GameUi.typography.body, color: GameColors.coral },
  notice: { ...GameUi.typography.body, color: GameColors.ink, padding: 12, backgroundColor: GameColors.cream, borderRadius: 12 }, form: { backgroundColor: GameColors.cream }, item: { marginBottom: Spacing.three },
  badge: { ...GameUi.typography.title, flex: 1, padding: 10, borderWidth: 2, borderColor: GameColors.ink, borderRadius: 12 }, sub: { flexDirection: 'row', alignItems: 'center', gap: 8 }, subName: { ...GameUi.typography.body, flex: 1, color: GameColors.ink },
});
