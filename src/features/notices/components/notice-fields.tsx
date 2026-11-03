import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GameInput } from '@/components/ui/game-input';
import { GameToggle } from '@/components/ui/game-toggle';
import { GameColors, GameUi, Spacing } from '@/constants/theme';
import type { NoticeCategory } from '@/types/notice';
import type { NoticeEditInput } from '@/types/notice-management';
import { noticeCharacterCount } from '@/utils/notice-compose';
import { FilterChips } from './filter-chips';

export function NoticeFields({ draft, categories, disabled, label, onChange, children }: { draft: NoticeEditInput; categories: readonly NoticeCategory[]; disabled: boolean; label: string; onChange: (value: Partial<NoticeEditInput>) => void; children?: ReactNode }) {
  const category = categories.find(one => one.id === draft.categoryId);
  return <View style={styles.fields}>
    <Text style={styles.label}>분류</Text><FilterChips label={`${label} 분류`} options={categories} value={draft.categoryId} disabled={disabled} onChange={id => onChange({ categoryId: id, subcategoryId: undefined })} />
    {!categories.length && <Text style={styles.error}>선택할 분류가 없어요. 분류를 확인한 뒤 다시 불러와 주세요.</Text>}
    {!!category?.subcategories.length && <><Text style={styles.label}>세부 분류</Text><FilterChips label={`${label} 세부 분류`} options={[{ id: '', name: '선택 안 함' }, ...category.subcategories]} value={draft.subcategoryId ?? ''} disabled={disabled} onChange={id => onChange({ subcategoryId: id || undefined })} /></>}
    <GameInput label="제목" value={draft.title} onChangeText={title => onChange({ title })} editable={!disabled} hint={`${noticeCharacterCount(draft.title) ?? '—'}/50자`} />
    <GameInput label="내용" value={draft.body} onChangeText={body => onChange({ body })} editable={!disabled} multiline textAlignVertical="top" style={styles.bodyInput} hint={`${noticeCharacterCount(draft.body) ?? '—'}/2,000자 · 긴 한글 본문을 입력할 수 있어요.`} />
    <View style={styles.options}><GameToggle label="상단 고정" hint="공지 목록 위쪽에 표시해요." value={draft.pinned} disabled={disabled} onChange={pinned => onChange({ pinned })} />{children && <><View style={styles.divider} />{children}</>}</View>
  </View>;
}
const styles = StyleSheet.create({
  fields: { gap: Spacing.three }, label: { ...GameUi.typography.body, color: GameColors.ink, fontWeight: '800' }, error: { ...GameUi.typography.body, color: GameColors.coral }, bodyInput: { minHeight: 180 },
  options: { padding: 12, backgroundColor: GameColors.paper, borderRadius: GameUi.radius.card, borderWidth: 2, borderColor: GameColors.ink, gap: 10 }, divider: { height: 2, backgroundColor: GameColors.track },
});
