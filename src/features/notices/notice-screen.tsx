import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GameButton } from '@/components/ui/game-button';
import { GameCard } from '@/components/ui/game-card';
import { GameHeader } from '@/components/ui/game-header';
import { GameColors, GameUi, Spacing } from '@/constants/theme';
import { useHome } from '@/features/home/hooks/use-home';
import { useClubs } from '@/state/club-context';
import type { JoinedClub } from '@/types/notice';
import { FilterChips } from './components/filter-chips';
import { NoticeCard } from './components/notice-card';
import { useNotices } from './hooks/use-notices';

export function NoticeScreen() {
  const clubs = useClubs();
  const selected = clubs.clubs.find(club => club.id === clubs.selectedId);
  if (clubs.status === 'ready' && !clubs.switching && selected) return <ClubNotices key={selected.id} club={selected} />;
  return <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}><View style={styles.message}>
    <Text accessibilityRole="header" style={styles.title}>NOTICE</Text>
    {clubs.status === 'loading' || clubs.switching ? <ActivityIndicator accessibilityLabel="동아리 확인 중" color={GameColors.ink} /> : <GameCard>
      <Text accessibilityRole={clubs.error ? 'alert' : undefined} style={styles.body}>{clubs.error ?? '가입한 동아리가 없어요. 동아리에 가입하고 승인을 받으면 공지를 확인할 수 있어요.'}</Text>
      <GameButton label="동아리 목록 다시 확인" onPress={() => { void clubs.refresh(); }} />
    </GameCard>}
  </View></SafeAreaView>;
}

function ClubNotices({ club }: { club: JoinedClub }) {
  const clubs = useClubs(), notices = useNotices(club.id), home = useHome();
  const category = notices.board?.categories.find(one => one.id === notices.filter.categoryId);
  return <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
    <FlatList
      style={styles.list} contentContainerStyle={styles.content}
      data={notices.board?.page.items ?? []} keyExtractor={item => item.id}
      refreshing={notices.loading} onRefresh={() => { void notices.refresh(); }}
      ListHeaderComponent={<View style={styles.heading}>
        <GameHeader balance={home.state.status === 'ready' ? home.state.data.profile.bolt : null} />
        <Text accessibilityRole="header" style={styles.title}>NOTICE</Text>
        <Text style={styles.body}>{club.name}</Text>
        <Text accessibilityLiveRegion="polite" style={styles.caption}>{notices.counterError ? '읽지 않은 수를 확인하지 못했어요. 새로고침해 주세요.' : notices.board ? `안 읽은 공지 ${notices.board.unreadCount}개` : '공지를 확인하고 있어요.'}</Text>
        <FilterChips label="동아리" value={club.id} options={clubs.clubs} onChange={id => { void clubs.selectClub(id); }} />
        {clubs.error && <Text accessibilityRole="alert" style={styles.error}>{clubs.error}</Text>}
        {notices.board && <>
          <FilterChips label="공지 분류" value={notices.filter.categoryId ?? ''} options={[{ id: '', name: '모두' }, ...notices.board.categories]} onChange={id => notices.setFilter(id ? { categoryId: id } : {})} />
          {!!category?.subcategories.length && <FilterChips label="세부 분류" value={notices.filter.subcategoryId ?? ''} options={[{ id: '', name: '전체' }, ...category.subcategories]} onChange={id => notices.setFilter({ categoryId: category.id, ...(id ? { subcategoryId: id } : {}) })} />}
        </>}
        {notices.loading && <ActivityIndicator accessibilityLabel="공지 목록 불러오는 중" color={GameColors.ink} />}
        {notices.error && <GameCard><Text accessibilityRole="alert" style={styles.body}>{notices.error}</Text><GameButton compact label="공지 다시 불러오기" onPress={() => { void notices.refresh(); }} /></GameCard>}
        <View style={styles.actions}><GameButton compact variant="secondary" label="공지 새로고침" disabled={notices.loading} onPress={() => { void notices.refresh(); }} /><GameButton compact variant="secondary" label="동아리 목록 다시 확인" onPress={() => { void clubs.refresh(); }} /></View>
      </View>}
      renderItem={({ item }) => notices.board ? <View style={styles.card}><NoticeCard notice={item} categories={notices.board.categories} authors={notices.board.authors} detail={notices.details[item.id]} onToggle={() => { void notices.openNotice(item.id); }} onRetry={() => { void notices.openNotice(item.id, true); }} /></View> : null}
      ListEmptyComponent={!notices.loading && !notices.error ? <GameCard><Text style={styles.body}>이 분류에 등록된 공지가 없어요.</Text></GameCard> : undefined}
      ListFooterComponent={<View style={styles.footer}>{notices.pageError && <Text accessibilityRole="alert" style={styles.error}>{notices.pageError}</Text>}{notices.board?.page.nextPageToken && <GameButton compact label={notices.loadingMore ? '불러오는 중…' : notices.pageError ? '다음 공지 다시 불러오기' : '공지 더 보기'} disabled={notices.loadingMore} onPress={() => { void notices.loadMore(); }} />}</View>}
    />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: GameColors.sky },
  list: { width: '100%', maxWidth: GameUi.contentWidth, alignSelf: 'center' },
  content: { flexGrow: 1, paddingHorizontal: 18, paddingTop: Spacing.four, paddingBottom: Spacing.four },
  heading: { gap: 10, marginBottom: Spacing.three },
  title: { ...GameUi.typography.number, fontSize: 45, lineHeight: 54, color: GameColors.yellow, textShadowColor: GameColors.ink, textShadowOffset: { width: 3, height: 4 }, textShadowRadius: 0 },
  body: { ...GameUi.typography.body, color: GameColors.ink },
  caption: { ...GameUi.typography.caption, color: GameColors.ink },
  error: { ...GameUi.typography.body, color: GameColors.coral },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { marginBottom: Spacing.three },
  footer: { gap: 10, paddingTop: 8 },
  message: { width: '100%', maxWidth: GameUi.contentWidth, alignSelf: 'center', padding: Spacing.four, gap: Spacing.three },
});
