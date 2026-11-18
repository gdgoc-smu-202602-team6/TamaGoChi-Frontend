import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { GameButton } from '@/components/ui/game-button';
import { GameCard } from '@/components/ui/game-card';
import { IconButton } from '@/components/ui/icon-button';
import { Palette } from '@/constants/palette';
import { GameColors, GameUi } from '@/constants/theme';
import type { Notice, NoticeCategory } from '@/types/notice';
import { noticeAuthor, noticeDate } from '@/utils/notice';
import type { NoticeDetail } from '../hooks/use-notices';

export function NoticeCard({ notice, categories, authors, detail, onToggle, onRetry, onManage }: { notice: Notice; categories: readonly NoticeCategory[]; authors: Readonly<Record<string, string>>; detail?: NoticeDetail; onToggle: () => void; onRetry: () => void; onManage?: () => void }) {
  const shown = detail?.notice ?? notice, category = categories.find(one => one.id === shown.categoryId), subcategory = category?.subcategories.find(one => one.id === shown.subcategoryId);
  const color = Palette[category?.color ?? 'GRAY'];
  return <GameCard contentStyle={styles.surface}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${shown.title} ${detail?.open ? '접기' : '펼치기'}`} accessibilityHint={`${noticeAuthor(shown, authors)}, ${noticeDate(shown.createdAt)}, ${shown.read ? '읽은 공지' : '읽지 않은 공지'}`} accessibilityState={{ expanded: !!detail?.open, disabled: detail?.loading }} disabled={detail?.loading} onPress={onToggle} style={styles.toggle}>
    <View style={styles.badges}>
      <Text style={[styles.badge, { backgroundColor: color.background, color: color.text }]}>{category?.name ?? '분류 정보 없음'}</Text>
      {subcategory && <Text style={styles.subcategory}>{subcategory.name}</Text>}
      {shown.pinned && <Text style={[styles.badge, styles.pinned]}>고정</Text>}
      {!shown.read && <Text style={styles.new}>NEW!</Text>}
      <Text style={[styles.caption, styles.date]}>{noticeDate(shown.createdAt)}</Text>
    </View>
    <Text accessibilityRole="header" style={styles.title}>{shown.title}</Text>
    <View style={styles.meta}><Text style={styles.caption}>{noticeAuthor(shown, authors)}</Text><Text style={styles.toggleText}>{detail?.open ? '접기 ▲' : '펼치기 ▼'}</Text></View>
    </Pressable>
    {detail?.open && <View style={styles.bodyArea}>
      {detail.loading && <ActivityIndicator accessibilityLabel="공지 내용 불러오는 중" color={GameColors.ink} />}
      {detail.notice && <Text selectable style={styles.body}>{detail.notice.body}</Text>}
      {detail.error && <><Text accessibilityRole="alert" style={styles.error}>{detail.error}</Text><GameButton compact label="내용 다시 불러오기" onPress={onRetry} /></>}
      {detail.readError && <><Text accessibilityRole="alert" style={styles.error}>읽음 상태를 저장하지 못했어요. {detail.readError}</Text><GameButton compact label="읽음 다시 확인" onPress={onRetry} /></>}
      {/* Editing is for managers only: a quiet pencil at the body's corner instead of a full-width button. */}
      {onManage && detail.notice && !detail.loading && <View style={styles.manage}><IconButton icon="pencil" label={`${shown.title} 수정·삭제`} onPress={onManage} /></View>}
    </View>}
  </GameCard>;
}
const styles = StyleSheet.create({
  surface: { backgroundColor: GameColors.paper, gap: 10 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  badge: { ...GameUi.typography.caption, fontWeight: '800', borderWidth: 1.5, borderColor: GameColors.ink, borderRadius: GameUi.radius.badge, paddingHorizontal: 9, paddingVertical: 2, overflow: 'hidden' },
  pinned: { backgroundColor: GameColors.yellow, color: GameColors.ink },
  subcategory: { ...GameUi.typography.caption, fontWeight: '800', color: GameColors.inkMuted, borderWidth: 1.5, borderColor: GameColors.inkSoft, borderRadius: GameUi.radius.badge, paddingHorizontal: 9, paddingVertical: 2, overflow: 'hidden' },
  new: { ...GameUi.typography.caption, color: GameColors.alert, fontWeight: '900' },
  title: { ...GameUi.typography.title, color: GameColors.ink, fontSize: 17, lineHeight: 25 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 },
  caption: { ...GameUi.typography.caption, color: GameColors.inkMuted },
  date: { marginLeft: 'auto' },
  toggle: { minHeight: 44, gap: 10 },
  toggleText: { ...GameUi.typography.body, color: GameColors.inkMuted, fontWeight: '700' },
  bodyArea: { paddingTop: 12, borderTopWidth: 1.5, borderColor: GameColors.line, borderStyle: 'dashed', gap: 10 },
  body: { ...GameUi.typography.body, fontSize: 15, lineHeight: 23, color: GameColors.ink },
  manage: { alignSelf: 'flex-end', marginTop: -6, marginBottom: -10, marginRight: -10 },
  error: GameUi.errorText,
});
