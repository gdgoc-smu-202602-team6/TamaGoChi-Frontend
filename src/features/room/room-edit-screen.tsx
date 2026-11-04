import { router, usePreventRemove } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GameButton } from '@/components/ui/game-button';
import { GameCard } from '@/components/ui/game-card';
import { GameColors, GameUi, Spacing } from '@/constants/theme';
import { ScreenHeader } from '@/components/ui/screen-header';
import { IconButton } from '@/components/ui/icon-button';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import type { PlacementTarget } from '@/types/room';
import { shopCategories, type ShopCategory } from '@/types/shop';
import { categoryLabels } from '@/features/shop/constants';
import { availableTargets, roomAppearance } from '@/utils/room-layout';
import { RoomInventory } from './components/room-inventory';
import { RoomScene } from './components/room-scene';
import { useRoomEditor } from './hooks/use-room-editor';

export function RoomEditScreen() {
  const editor = useRoomEditor(), snapshot = editor.snapshot;
  const [category, setCategory] = useState<ShopCategory>('FURNITURE'), [selected, setSelected] = useState<PlacementTarget | null>(null);
  const [dragging, setDragging] = useState(false), [allowLeave, setAllowLeave] = useState(false);
  const [leavePrompt, setLeavePrompt] = useState(false), [reloadPrompt, setReloadPrompt] = useState(false);
  const leaveAction = useRef<(() => void) | null>(null);
  const saving = editor.operation === 'save', sceneDisabled = !!editor.operation || !!editor.blocked || leavePrompt || reloadPrompt, disabled = sceneDisabled || dragging;
  const prevent = !allowLeave && (editor.dirty || saving);
  const disablePrevention = usePreventRemove(prevent, ({ repeat }) => { if (!saving) { leaveAction.current = repeat; setLeavePrompt(true); } });
  function leave(path: '/' | '/shop') {
    if (editor.operation || dragging) return;
    if (prevent) { leaveAction.current = () => router.dismissTo(path); setLeavePrompt(true); }
    else router.dismissTo(path);
  }
  function confirmLeave() { setAllowLeave(true); disablePrevention(); setLeavePrompt(false); leaveAction.current?.(); }
  async function save() { if (await editor.save()) { setAllowLeave(true); disablePrevention(); router.dismissTo('/'); } }
  const targets = snapshot ? availableTargets(snapshot.draft, snapshot.data.items) : [];
  const activeTarget = selected && targets.includes(selected) ? selected : null;
  return <SafeAreaView style={styles.screen}>
    <ScrollView scrollEnabled={!dragging} contentContainerStyle={styles.scroll}>
      <View style={styles.content}>
        <ScreenHeader title="방 꾸미기" onBack={() => leave('/')} backDisabled={!!editor.operation || dragging} backLabel="내 방으로 돌아가기" actions={<IconButton icon="refresh" label="위치 초기화" disabled={disabled} onPress={editor.resetPositions} />} />
        {editor.operation && <ActivityIndicator accessibilityLabel={saving ? '방 배치 저장 중' : '방 정보 확인 중'} color={GameColors.ink} />}
        {editor.error && !snapshot && <Text accessibilityRole="alert" style={styles.error}>{editor.error}</Text>}
        {editor.notice && <Text accessibilityLiveRegion="polite" style={styles.notice}>{editor.notice}</Text>}
        {leavePrompt && <GameCard>
          <Text style={styles.body}>{editor.blocked === 'uncertain' ? '저장 결과가 불확실하면 서버에는 이미 반영됐을 수 있어요. 편집 화면을 나갈까요?' : '저장하지 않은 편집 내용을 버리고 이동할까요?'}</Text>
          <GameButton label="편집 계속하기" onPress={() => { setLeavePrompt(false); leaveAction.current = null; }} />
          <GameButton variant="secondary" label="저장하지 않고 이동" onPress={confirmLeave} />
        </GameCard>}
        {editor.blocked && <GameCard>
          <Text style={styles.body}>{editor.blocked === 'changed' ? '다른 기기나 상점에서 방 상태가 바뀌었어요. 서버 방을 다시 불러온 뒤 꾸며 주세요.' : '서버 상태를 확인할 때까지 저장을 기다려 주세요. 다시 확인은 조회만 합니다.'}</Text>
          <GameButton compact label="저장 상태 다시 확인" disabled={!!editor.operation} onPress={() => { void editor.refresh(); }} />
          {snapshot && <GameButton compact variant="secondary" label="서버 방 다시 불러오기" disabled={!!editor.operation} onPress={() => setReloadPrompt(true)} />}
        </GameCard>}
        {reloadPrompt && <GameCard><Text style={styles.body}>현재 편집을 버리고 서버에 저장된 방을 불러올까요?</Text><GameButton label="편집 유지" onPress={() => setReloadPrompt(false)} /><GameButton variant="secondary" label="서버 방으로 되돌리기" onPress={() => { setReloadPrompt(false); void editor.refresh(true); }} /></GameCard>}
        {snapshot ? <>
          <RoomScene appearance={roomAppearance(snapshot.data, snapshot.draft)} bugs={snapshot.data.condition.bugs} interaction={{ selected: activeTarget, disabled: sceneDisabled, onSelect: setSelected, onMove: editor.move, onCancel: editor.cancelMove, onDragging: setDragging }} />
          {editor.error && <Text accessibilityRole="alert" style={styles.error}>{editor.error}</Text>}
          <GameCard>
            <Text accessibilityRole="header" style={styles.title}>보유 아이템</Text>
            <SegmentedTabs label="아이템 분류" value={category} options={shopCategories.map(id => ({ id, name: categoryLabels[id] }))} onChange={setCategory} disabled={disabled} />
            <RoomInventory data={snapshot.data} layout={snapshot.draft} category={category} disabled={disabled} onToggle={editor.toggle} />
            <View style={styles.footer}>
              <GameButton variant="secondary" icon="shop" label="상점 가기" disabled={!!editor.operation || dragging} onPress={() => leave('/shop')} style={styles.shopButton} />
              <GameButton variant="success" icon="check" label={saving ? '저장 중…' : '완료'} accessibilityLabel="방 꾸미기 완료" disabled={disabled} onPress={() => { void save(); }} style={styles.doneButton} />
            </View>
          </GameCard>
        </> : !editor.operation && <GameButton label="방 다시 불러오기" onPress={() => { void editor.refresh(); }} />}
      </View>
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: GameColors.sky }, scroll: { flexGrow: 1, paddingVertical: Spacing.three },
  content: { width: '100%', maxWidth: GameUi.contentWidth, alignSelf: 'center', paddingHorizontal: 18, gap: Spacing.three },
  title: { ...GameUi.typography.title, color: GameColors.ink },
  footer: { flexDirection: 'row', gap: 10 }, shopButton: { flex: 1 }, doneButton: { flex: 1.4 },
  body: { ...GameUi.typography.body, color: GameColors.ink },
  error: GameUi.errorText, notice: { ...GameUi.typography.body, fontWeight: '700', color: GameColors.ink, backgroundColor: GameColors.cream, borderWidth: GameUi.borderWidth, borderColor: GameColors.ink, padding: 12, borderRadius: 12, overflow: 'hidden' },
});
