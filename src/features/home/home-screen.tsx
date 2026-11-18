import { ActivityIndicator, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GameButton } from '@/components/ui/game-button';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { GameColors, GameUi, Spacing } from '@/constants/theme';
import { HomeStatus } from '@/features/home/components/home-header';
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
  // The play button should sit above the tab bar without scrolling, so the room shrinks on shorter
  // phones. 550 is roughly the top bar, study card and tab bar together; small phones still scroll.
  const { height } = useWindowDimensions();
  const roomSize = Math.max(240, height - 550);
  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScreenHeader title={state.status === 'ready' ? `${state.data.profile.nickname}의 방` : '내 방'} actions={<>
          {onVisitFriends && <IconButton icon="group" label="친구 방" onPress={onVisitFriends} />}
          <GuestbookEntry variant="icon" label="방명록" onPress={onOpenGuestbook} />
        </>} />
        {state.status === 'ready' ? (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.content}>
              {/* The status row and decorate button span the full content width so they stay in the empty
                  corners even when a short window shrinks the room; only the room itself is narrowed. */}
              <View style={styles.stage}>
                <HomeStatus profile={state.data.profile} bugs={state.data.bugs.count} style={styles.status} />
                <View style={[styles.room, { maxWidth: roomSize }]}>
                  <RoomPreview bugs={state.data.bugs.count} name={state.data.room.name} characterLabel={state.data.room.characterLabel} appearance={state.data.room.appearance} />
                </View>
                {/* Like the status row, decorating sits in the stage's empty bottom-right corner, not on the
                    room, so a smaller room never slides its floor under the button. */}
                <GameButton label="방 꾸미기" icon="pencil" compact variant="secondary" onPress={onEditRoom} style={styles.decorate} />
              </View>
              <StudySummary home={state.data} onStartStudy={onStartStudy} actionLabel={studyActionLabel} actionDisabled={studyActionDisabled} actionError={studyActionError} />
            </View>
          </ScrollView>
        ) : (
          <View style={styles.message}>
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
  scrollContent: { flexGrow: 1, paddingTop: 14, paddingBottom: Spacing.four },
  content: { width: '100%', maxWidth: GameUi.contentWidth, alignSelf: 'center', paddingHorizontal: 18, gap: Spacing.three },
  // The bottom padding keeps the room's front floor edge above the decorate button.
  stage: { alignItems: 'center', paddingBottom: 20 },
  room: { width: '100%' },
  status: { position: 'absolute', left: 0, right: 0, top: 0, zIndex: 1 },
  decorate: { position: 'absolute', right: 0, bottom: -4 },
  message: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.four, gap: Spacing.three },
  messageText: { ...GameUi.typography.body, color: GameColors.ink, textAlign: 'center' },
});
