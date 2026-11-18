import { ActivityIndicator, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

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
import { SkyClouds } from '@/components/ui/sky-clouds';

const ROOM_CHROME = 536;

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
  // phones. ROOM_CHROME is the top bar, status row, study card and tab bar together.
  const { height } = useWindowDimensions(), insets = useSafeAreaInsets();
  // On phones the status bar and home indicator also take height (the tab bar keeps at least 10 below).
  const roomSize = Math.max(240, height - insets.top - Math.max(insets.bottom, 10) + 10 - ROOM_CHROME);
  return (
    <View style={styles.screen}>
      <SkyClouds />
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScreenHeader title={state.status === 'ready' ? `${state.data.profile.nickname}의 방` : '내 방'} actions={<>
          {onVisitFriends && <IconButton icon="group" label="친구 방" onPress={onVisitFriends} />}
        </>} />
        {state.status === 'ready' ? (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.content}>
              {/* No panel: the status row sits on top, the room's top corner starts right under it, and
                  the guestbook and decorating take the stage's empty bottom corners. Only the room is narrowed on short
                  screens, so the row and button never slide over it. */}
              <View style={styles.stage}>
                <HomeStatus profile={state.data.profile} bugs={state.data.bugs.count} style={styles.status} />
                <View style={[styles.room, { maxWidth: roomSize }]}>
                  <RoomPreview bugs={state.data.bugs.count} name={state.data.room.name} characterLabel={state.data.room.characterLabel} appearance={state.data.room.appearance} />
                </View>
                {/* As in the v4 mockup, the room's two actions share its empty bottom corners. */}
                <GuestbookEntry label="방명록" onPress={onOpenGuestbook} style={styles.guestbook} />
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
  stage: { gap: 6, paddingBottom: 20 },
  status: { alignSelf: 'stretch' },
  room: { width: '100%', alignSelf: 'center' },
  guestbook: { position: 'absolute', left: 0, bottom: -4 },
  decorate: { position: 'absolute', right: 0, bottom: -4 },
  message: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.four, gap: Spacing.three },
  messageText: { ...GameUi.typography.body, color: GameColors.ink, textAlign: 'center' },
});
