import { router, usePreventRemove } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GameButton } from '@/components/ui/game-button';
import { GameCard } from '@/components/ui/game-card';
import { GameColors, GameUi, Spacing } from '@/constants/theme';
import { FilterChips } from '@/features/notices/components/filter-chips';
import type { PlacementTarget } from '@/types/room';
import { shopCategories, type ShopCategory } from '@/types/shop';
import { availableTargets, effectivePlacement, roomAppearance, roomSize, targetLabels } from '@/utils/room-layout';
import { RoomInventory } from './components/room-inventory';
import { RoomScene } from './components/room-scene';
import { useRoomEditor } from './hooks/use-room-editor';

const categoryLabels: Record<ShopCategory, string> = { FURNITURE: '가구', WALLPAPER: '벽지', ACCESSORY: '캐릭터', ROOM_SIZE: '방 확장' };
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
  const targets = snapshot ? availableTargets(snapshot.draft) : [];
  const activeTarget = selected && targets.includes(selected) ? selected : null;
  const size = snapshot ? roomSize(snapshot.draft, snapshot.data.items) : 0;
  const point = activeTarget && snapshot ? effectivePlacement(snapshot.draft, activeTarget, size) : null;
  return <SafeAreaView style={styles.screen}>
    <ScrollView scrollEnabled={!dragging} contentContainerStyle={styles.scroll}>
      <View style={styles.content}>
        <View style={styles.heading}><GameButton compact variant="secondary" label="◀ 내 방" disabled={!!editor.operation || dragging} onPress={() => leave('/')} /><Text accessibilityRole="header" style={styles.title}>방 꾸미기</Text></View>
        {editor.operation && <ActivityIndicator accessibilityLabel={saving ? '방 배치 저장 중' : '방 정보 확인 중'} color={GameColors.ink} />}
        {editor.error && <Text accessibilityRole="alert" style={styles.error}>{editor.error}</Text>}
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
          <RoomScene appearance={roomAppearance(snapshot.data, snapshot.draft)} bugs={snapshot.data.condition.bugs} interaction={{ selected: activeTarget, disabled: sceneDisabled, onSelect: setSelected, onMove: editor.move, onDragging: setDragging }} />
          <GameCard>
            <Text accessibilityRole="header" style={styles.title}>보유 아이템</Text>
            <Text style={styles.caption}>선택하면 미리보기에 반영돼요. 완료를 눌러야 저장됩니다. 현재 방 {size}×{size}칸</Text>
            <FilterChips label="아이템 분류" value={category} options={shopCategories.map(id => ({ id, name: categoryLabels[id] }))} onChange={id => setCategory(id as ShopCategory)} disabled={disabled} />
            <RoomInventory data={snapshot.data} layout={snapshot.draft} category={category} disabled={disabled} onToggle={editor.toggle} />
            <Text accessibilityRole="header" style={styles.title}>위치 조정</Text>
            <Text style={styles.caption}>방 안의 물건을 끌어 옮겨요. 아래에서 대상을 고른 뒤 버튼으로도 이동할 수 있어요. 물건끼리 겹쳐도 됩니다.</Text>
            <FilterChips label="배치 대상" value={activeTarget ?? ''} options={targets.map(id => ({ id, name: targetLabels[id] }))} onChange={id => setSelected(id as PlacementTarget)} disabled={disabled} />
            {point && <>
              <Text accessibilityLiveRegion="polite" style={styles.body}>{targetLabels[point.target]} · {point.x.toFixed(2)}, {point.y.toFixed(2)}칸{point.target === 'DESK' || point.target === 'BOOKSHELF' ? ' · 반 칸씩 이동' : ''}</Text>
              <View style={styles.moves}>{([{ label: 'X −', dx: -.5, dy: 0 }, { label: 'X +', dx: .5, dy: 0 }, { label: 'Y −', dx: 0, dy: -.5 }, { label: 'Y +', dx: 0, dy: .5 }]).map(move => <GameButton key={move.label} compact label={move.label} accessibilityLabel={`${targetLabels[point.target]} ${move.label}`} disabled={disabled} onPress={() => editor.move({ ...point, x: point.x + move.dx, y: point.y + move.dy })} />)}</View>
            </>}
            <GameButton compact variant="secondary" label="위치 초기화" disabled={disabled} onPress={editor.resetPositions} />
            <Text style={styles.caption}>벽의 시계·창문·스탠드는 고정 위치이며, 캐릭터 장식은 캐릭터와 함께 이동해요. 방은 다른 보유 방으로 교체할 수 있어요.</Text>
            <GameButton label={saving ? '저장 확인 중…' : '완료 · 저장하고 나가기'} disabled={disabled} onPress={() => { void save(); }} />
            <GameButton compact variant="secondary" label="상점 가기" disabled={!!editor.operation || dragging} onPress={() => leave('/shop')} />
          </GameCard>
        </> : !editor.operation && <GameButton label="방 다시 불러오기" onPress={() => { void editor.refresh(); }} />}
      </View>
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: GameColors.sky }, scroll: { flexGrow: 1, paddingVertical: Spacing.three },
  content: { width: '100%', maxWidth: GameUi.contentWidth, alignSelf: 'center', paddingHorizontal: 18, gap: Spacing.three },
  heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }, title: { ...GameUi.typography.title, color: GameColors.ink },
  body: { ...GameUi.typography.body, color: GameColors.ink }, caption: { ...GameUi.typography.caption, color: GameColors.inkMuted },
  error: { ...GameUi.typography.body, color: GameColors.coral }, notice: { ...GameUi.typography.body, color: GameColors.ink, backgroundColor: GameColors.cream, padding: 12, borderRadius: 12 }, moves: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
