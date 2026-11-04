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
              <HomeHeader profile={state.data.profile} onVisitFriends={onVisitFriends} />
              <View style={styles.roomSection}>
                <RoomPreview bugs={state.data.bugs.count} name={state.data.room.name} characterLabel={state.data.room.characterLabel} appearance={state.data.room.appearance} />
                <View pointerEvents="none" style={[styles.status, state.data.bugs.count > 0 && styles.bugStatus]}>
                  <PixelIcon name={state.data.bugs.count > 0 ? 'bug' : 'heart'} size={18} />
                  <Text style={styles.statusText}>{state.data.bugs.count > 0 ? `버그 ${state.data.bugs.count}` : '깨끗한 방'}</Text>
                </View>
                {/* Room shortcuts sit in the empty corners beside the floor, as in the v4 home. */}
                <View pointerEvents="box-none" style={styles.corners}>
                  <GuestbookEntry label="방명록" onPress={onOpenGuestbook} />
                  <GameButton label="방 꾸미기" icon="pencil" compact variant="secondary" onPress={onEditRoom} />
                </View>
              </View>
              <StudySummary home={state.data} onStartStudy={onStartStudy} actionLabel={studyActionLabel} actionDisabled={studyActionDisabled} actionError={studyActionError} />
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
  scrollContent: { flexGrow: 1, paddingTop: Spacing.three, paddingBottom: Spacing.four },
  content: { width: '100%', maxWidth: GameUi.contentWidth, alignSelf: 'center', paddingHorizontal: 18, gap: Spacing.three },
  roomSection: { marginTop: -Spacing.one },
  status: { position: 'absolute', top: 0, left: 0, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: GameColors.paper, borderWidth: GameUi.borderWidth, borderColor: GameColors.ink, borderRadius: GameUi.radius.badge, paddingVertical: 4, paddingHorizontal: 10 },
  bugStatus: { backgroundColor: GameColors.alertLight },
  statusText: { ...GameUi.typography.caption, fontWeight: '800', color: GameColors.ink },
  corners: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  message: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.four, gap: Spacing.three },
  messageTitle: { ...GameUi.typography.brand, color: GameColors.ink },
  messageText: { ...GameUi.typography.body, color: GameColors.ink, textAlign: 'center' },
});
