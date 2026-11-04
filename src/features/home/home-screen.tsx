import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GameButton } from '@/components/ui/game-button';
import { PixelIcon } from '@/components/ui/pixel-icon';
import { GameColors, GameUi, Spacing } from '@/constants/theme';
import { HomeHeader } from '@/features/home/components/home-header';
import { RoomPreview } from '@/features/home/components/room-preview';
import { StudySummary } from '@/features/home/components/study-summary';
import { useHome } from '@/features/home/hooks/use-home';
import type { HomeService } from '@/types/home';
import { GuestbookEntry } from '@/features/guestbook/guestbook-entry';

type HomeScreenProps = {
  service?: HomeService;
  onStartStudy?: () => void;
  onEditRoom?: () => void;
  onVisitFriends?: () => void;
  onOpenGuestbook?: () => void;
  refreshKey?: number;
  studyActionLabel?: string;
  studyActionDisabled?: boolean;
  studyActionError?: string | null;
};

export function HomeScreen({ service, onStartStudy, onEditRoom, onVisitFriends, onOpenGuestbook, refreshKey, studyActionLabel, studyActionDisabled, studyActionError }: HomeScreenProps) {
  const { state, retry } = useHome(service, refreshKey);
  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        {state.status === 'ready' ? (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.content}>
              <HomeHeader profile={state.data.profile} />
              <View style={styles.roomSection}>
                <View style={styles.roomStatus}>
                  <View style={styles.statusBadge}>
                    <PixelIcon name={state.data.bugs.count > 0 ? 'bug' : 'heart'} size={19} />
                    <Text style={styles.statusText}>{state.data.bugs.count > 0 ? `버그 ${state.data.bugs.count}` : '깨끗한 방'}</Text>
                  </View>
                  <PixelIcon name="cloud" size={58} />
                </View>
                <RoomPreview bugs={state.data.bugs.count} name={state.data.room.name} characterLabel={state.data.room.characterLabel} appearance={state.data.room.appearance} />
                <GameButton label="방 꾸미기" compact variant="secondary" onPress={onEditRoom} style={styles.editButton} />
              </View>
              <StudySummary home={state.data} onStartStudy={onStartStudy} actionLabel={studyActionLabel} actionDisabled={studyActionDisabled} actionError={studyActionError} />
              <View style={styles.actions}>
                <GameButton label="친구 방" compact variant="secondary" onPress={onVisitFriends} style={styles.action} />
                <GuestbookEntry label="방명록" onPress={onOpenGuestbook} style={styles.action} />
              </View>
            </View>
          </ScrollView>
        ) : (
          <View style={styles.message}>
            <Text style={styles.messageTitle}>내 방</Text>
            {state.status === 'loading' ? <>
              <ActivityIndicator color={GameColors.ink} accessibilityLabel="내 방 불러오는 중" />
              <Text style={styles.messageText}>내 방을 불러오고 있어요.</Text>
            </> : <>
              <Text accessibilityRole="alert" style={styles.messageText}>내 방을 불러오지 못했어요.{"\n"}잠시 후 다시 시도해 주세요.</Text>
              <GameButton label="다시 시도" onPress={retry} />
            </>}
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: GameColors.sky },
  safeArea: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingVertical: Spacing.three },
  content: { width: '100%', maxWidth: GameUi.contentWidth, alignSelf: 'center', paddingHorizontal: 18, gap: Spacing.three },
  roomSection: { marginTop: -Spacing.two },
  roomStatus: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, backgroundColor: GameColors.skyLight, borderRadius: GameUi.radius.badge, paddingVertical: 6, paddingHorizontal: 10 },
  statusText: { ...GameUi.typography.caption, color: GameColors.inkMuted },
  editButton: { alignSelf: 'flex-end', marginTop: -40 },
  actions: { flexDirection: 'row', gap: Spacing.two },
  action: { flex: 1 },
  message: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.four, gap: Spacing.three },
  messageTitle: { ...GameUi.typography.brand, color: GameColors.ink },
  messageText: { ...GameUi.typography.body, color: GameColors.ink, textAlign: 'center' },
});
