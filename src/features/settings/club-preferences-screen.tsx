import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GameButton } from '@/components/ui/game-button';
import { GameCard } from '@/components/ui/game-card';
import { GameToggle } from '@/components/ui/game-toggle';
import { Palette } from '@/constants/palette';
import { GameColors, GameUi } from '@/constants/theme';
import { useClubPreferences } from './hooks/use-personal-settings';
import { SettingsFrame } from './settings-frame';

export function ClubPreferencesScreen({ clubId }: { clubId: string }) { const manager = useClubPreferences(clubId); return <PreferencesContent key={manager.data ? 'loaded' : 'unavailable'} manager={manager} />; }
function PreferencesContent({ manager }: { manager: ReturnType<typeof useClubPreferences> }) {
  const [baseline, setBaseline] = useState(manager.data), [partId, setPartId] = useState(manager.data?.member.partId ?? ''), [notificationsOn, setNotifications] = useState(manager.data?.notificationsOn ?? false);
  const dirty = !!baseline && (partId !== baseline.member.partId || notificationsOn !== baseline.notificationsOn), disabled = !!manager.operation || !manager.verified;
  return <SettingsFrame title="내 소속·알림 설정" saving={manager.operation === 'save'} dirty={dirty} operation={manager.operation} error={manager.error} notice={manager.notice} onRefresh={() => { void manager.refresh(); }}>
    {manager.data && <GameCard><Text accessibilityRole="header" style={styles.title}>{manager.data.club.name}</Text><Text style={styles.body}>{manager.data.member.nickname} · 내 소속 파트</Text><View accessibilityRole="radiogroup" accessibilityLabel="내 소속 파트" style={styles.parts}>{manager.data.parts.map(part => <Pressable key={part.id} accessibilityRole="radio" aria-checked={part.id === partId} accessibilityLabel={`소속 파트 ${part.name}`} accessibilityState={{ checked: part.id === partId, disabled }} disabled={disabled} onPress={() => setPartId(part.id)} style={[styles.part, { backgroundColor: part.id === partId ? GameColors.yellow : Palette[part.color].background }]}><Text style={[styles.body, { color: part.id === partId ? GameColors.ink : Palette[part.color].text }]}>{part.name}</Text></Pressable>)}</View>
      <GameToggle label="이 동아리의 공지 알림" hint="이 동아리의 공지 알림 수신 여부를 설정해요." value={notificationsOn} disabled={disabled} onChange={setNotifications} />
      <GameButton label="내 동아리 설정 저장" disabled={disabled || !dirty || !manager.data.parts.some(one => one.id === partId)} onPress={() => { if (baseline) void manager.save(baseline, { partId, notificationsOn }).then(next => { if (next) { setBaseline(next); setPartId(next.member.partId); setNotifications(next.notificationsOn); } }); }} />
      <GameButton variant="secondary" label="현재 값으로 입력" disabled={disabled} onPress={() => { setBaseline(manager.data); setPartId(manager.data!.member.partId); setNotifications(manager.data!.notificationsOn); }} />
    </GameCard>}
    <GameButton variant="secondary" label="동아리 가입·신청" disabled={!!manager.operation} onPress={() => router.push('/clubs/join')} />
  </SettingsFrame>;
}
const styles = StyleSheet.create({ title: { ...GameUi.typography.title, color: GameColors.ink }, body: { ...GameUi.typography.body, color: GameColors.ink, fontWeight: '700' }, parts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, part: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 8, borderWidth: GameUi.borderWidth, borderColor: GameColors.ink, borderRadius: 12 } });
