import { StyleSheet, Text, View } from 'react-native';

import { GameButton } from '@/components/ui/game-button';
import { GameCard } from '@/components/ui/game-card';
import { Palette } from '@/constants/palette';
import { GameColors, GameUi } from '@/constants/theme';
import type { ApplicationDecision, ReviewApplication } from '@/types/club-admin';
import type { ClubPart } from '@/types/club-join';
import { noticeDate } from '@/utils/notice';

export function ReviewApplicationCard({ application, parts, disabled, processing, onDecide }: { application: ReviewApplication; parts: readonly ClubPart[]; disabled: boolean; processing: boolean; onDecide: (decision: ApplicationDecision) => void }) {
  const name = application.nickname || '신청자 정보 없음', part = parts.find(part => part.id === application.partId), palette = Palette[part?.color ?? 'GRAY'];
  return <GameCard contentStyle={styles.card}>
    <View style={styles.heading}><View style={[styles.avatar, { backgroundColor: palette.background }]}><Text style={[styles.initial, { color: palette.text }]}>{Array.from(name)[0]}</Text></View>
      <View style={styles.identity}><Text accessibilityRole="header" style={styles.name}>{name}</Text><Text selectable style={styles.caption}>{application.email || '이메일 정보 없음'}</Text></View>
    </View>
    <View style={styles.details}><Text style={[styles.part, { backgroundColor: palette.background, color: palette.text }]}>{part?.name ?? (application.partId === null ? '삭제된 파트' : '파트 정보 없음')}</Text><Text style={styles.caption}>{noticeDate(application.createdAt)} 신청</Text></View>
    <View style={styles.actions}>
      <GameButton compact variant="secondary" label={processing ? '처리 확인 중…' : '거절'} accessibilityLabel={`${name} 가입 거절`} disabled={disabled} onPress={() => onDecide('REJECTED')} style={styles.action} />
      <GameButton compact variant="success" label={processing ? '처리 확인 중…' : '승인'} accessibilityLabel={`${name} 가입 승인`} disabled={disabled} onPress={() => onDecide('APPROVED')} style={styles.action} />
    </View>
  </GameCard>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: GameColors.paper }, heading: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  avatar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: GameColors.ink, borderRadius: 12 }, initial: { ...GameUi.typography.title },
  identity: { flex: 1, minWidth: 0, gap: 4 }, name: { ...GameUi.typography.title, color: GameColors.ink }, caption: { ...GameUi.typography.caption, color: GameColors.inkMuted },
  details: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 }, part: { ...GameUi.typography.caption, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 5, borderWidth: 2, borderColor: GameColors.ink, borderRadius: GameUi.radius.badge },
  actions: { flexDirection: 'row', gap: 10 }, action: { flex: 1 },
});
