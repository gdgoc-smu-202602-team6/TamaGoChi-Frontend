import { StyleSheet, Text, View } from 'react-native';

import { GameButton } from '@/components/ui/game-button';
import { GameCard } from '@/components/ui/game-card';
import { PixelIcon } from '@/components/ui/pixel-icon';
import { GameColors, GameUi } from '@/constants/theme';
import type { ClubApplication } from '@/types/club-join';
import { noticeDate } from '@/utils/notice';

export function ApplicationCard({ application, disabled, onCancel, onOpen }: { application: ClubApplication; disabled: boolean; onCancel: () => void; onOpen?: () => void }) {
  const pending = application.state === 'PENDING';
  return <GameCard contentStyle={styles.surface}>
    <View style={styles.row}>{pending && <PixelIcon name="hourglass" size={30} />}<Text accessibilityRole="header" style={styles.title}>{application.clubName ?? '동아리 가입 신청'}</Text></View>
    <Text style={styles.status}>{pending ? '가입 승인을 기다리고 있어요' : application.state === 'APPROVED' ? '운영진이 신청을 승인했어요' : '운영진이 신청을 거절했어요'}</Text>
    <Text style={styles.body}>신청 파트: {application.partId === null ? '삭제된 파트' : application.partName ?? '파트 정보 없음'}</Text>
    <Text style={styles.caption}>신청일 {noticeDate(application.createdAt)}</Text>
    {pending && <><Text style={styles.caption}>기다리는 동안에도 내 방에서 공부하고 상점을 이용할 수 있어요.</Text><GameButton compact variant="secondary" label="신청 취소" accessibilityLabel={`${application.clubName ?? '동아리'} 신청 취소`} disabled={disabled} onPress={onCancel} /></>}
    {onOpen && <GameButton compact label="동아리 공지 보기" accessibilityLabel={`${application.clubName ?? '동아리'} 공지 보기`} disabled={disabled} onPress={onOpen} />}
    {application.state === 'APPROVED' && !onOpen && <Text style={styles.caption}>현재 부원 자격이 확인되면 공지 버튼이 표시돼요. 가입 상태를 다시 확인해 주세요.</Text>}
  </GameCard>;
}
const styles = StyleSheet.create({
  surface: { gap: 10 }, row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { ...GameUi.typography.title, color: GameColors.ink, flex: 1 },
  status: { ...GameUi.typography.body, color: GameColors.ink, fontWeight: '800' },
  body: { ...GameUi.typography.body, color: GameColors.ink },
  caption: { ...GameUi.typography.caption, color: GameColors.inkMuted },
});
