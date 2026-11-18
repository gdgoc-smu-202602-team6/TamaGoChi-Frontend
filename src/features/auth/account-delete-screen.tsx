import { Redirect, router, usePreventRemove } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { GameButton } from '@/components/ui/game-button';
import { GameCard } from '@/components/ui/game-card';
import { GameConfirmDialog } from '@/components/ui/game-confirm-dialog';
import { GameScreen } from '@/components/ui/game-screen';
import { isMockMode } from '@/constants/api';
import { GameColors, GameUi } from '@/constants/theme';
import { apiErrorMessage, ApiError } from '@/services/api/http-client';
import { useAuth } from '@/state/auth-context';
import { AccountDeletionError } from '@/types/auth';

function errorText(error: unknown) {
  if (error instanceof ApiError && error.code === 'last-manager') return '마지막 운영진인 동아리가 있어 탈퇴할 수 없어요. 해당 동아리에서 다른 부원을 운영진으로 지정한 뒤 다시 확인해 주세요.';
  if (error instanceof AccountDeletionError) return { uncertain: '탈퇴 요청의 결과를 확인하지 못했어요. 삭제를 다시 요청하지 않고 계정 상태만 확인할 수 있어요.', cleanup: '서버의 계정 삭제는 완료됐지만 이 기기의 로그인 정보·임시 기록 정리가 남아 있어요.', changed: '로그인 정보가 바뀌어 이전 계정의 탈퇴를 진행할 수 없어요.' }[error.reason];
  return apiErrorMessage(error);
}
export function AccountDeleteScreen() {
  const auth = useAuth(), [confirm, setConfirm] = useState(false), [error, setError] = useState<string | null>(null), [notice, setNotice] = useState<string | null>(null), running = useRef(false);
  usePreventRemove(auth.busy, () => {});
  const run = async (work: () => Promise<void>) => { if (running.current) return; running.current = true; setConfirm(false); setError(null); setNotice(null); try { await work(); setNotice('계정 상태를 다시 확인했어요.'); } catch (reason) { setError(errorText(reason)); } finally { running.current = false; } };
  const status = auth.deletionStatus;
  if (!isMockMode && status === 'idle' && auth.state.status === 'ready' && !auth.state.user) return <Redirect href="/login" />;
  return <GameScreen title="계정 탈퇴" subtitle="탈퇴 전 삭제되는 내용을 확인해 주세요.">
    <GameCard>
      {isMockMode ? <Text style={styles.body}>미리보기에는 실제 계정이 없어요. 계정 탈퇴는 API 모드에서 로그인한 계정에만 사용할 수 있어요.</Text>
        : status === 'deleted' ? <Text accessibilityLiveRegion="polite" style={styles.body}>계정 탈퇴와 이 기기의 로그인 정보·임시 기록 정리를 완료했어요.</Text>
        : status === 'cleanup' ? <><Text accessibilityRole="alert" style={styles.body}>서버 계정 삭제가 완료됐어요. 기기 기록 정리만 다시 진행해 주세요.</Text><GameButton label="기기 기록 정리" disabled={auth.busy} onPress={() => { void run(auth.checkAccountDeletion); }} /></>
        : status === 'uncertain' || status === 'unavailable' ? <>
          <Text accessibilityRole="alert" style={styles.body}>탈퇴 결과를 확정할 수 없어요. 세션 만료와 계정 삭제는 이 화면에서 구분할 수 없으며 삭제 요청을 자동 반복하지 않아요.</Text>
          {status === 'uncertain' && <GameButton label="탈퇴 결과 다시 확인" disabled={auth.busy} onPress={() => { void run(auth.checkAccountDeletion); }} />}
          {status === 'unavailable' && <GameButton label="로그인 화면으로" disabled={auth.busy} onPress={() => { if (auth.state.user) void run(async () => { await auth.signOut(); router.replace('/login'); }); else router.replace('/login'); }} />}
        </> : auth.state.status !== 'ready' ? <>
          {auth.state.status === 'loading' ? <ActivityIndicator accessibilityLabel="계정 확인 중" color={GameColors.ink} /> : <><Text accessibilityRole="alert" style={styles.body}>{auth.state.error}</Text><GameButton label="계정 다시 확인" onPress={() => { void auth.refresh(); }} /></>}
        </> : auth.state.user && <>
          <Text style={styles.account}>{auth.state.user.nickname} · {auth.state.user.email}</Text>
          <Text style={styles.body}>계정, 공부 기록, 볼트·XP, 방·보유 아이템·좋아요와 모든 동아리의 부원 자격을 삭제해요. 이 작업은 되돌릴 수 없어요.</Text>
          <Text style={styles.body}>작성한 공지와 다른 방에 남긴 방명록은 남으며 작성자가 ‘탈퇴한 사용자’로 표시돼요.</Text>
          <Text style={styles.body}>마지막 운영진인 동아리가 있으면 다른 부원을 운영진으로 지정해야 탈퇴할 수 있어요.</Text>
          <GameButton label="계정 탈퇴하기" disabled={auth.busy} onPress={() => setConfirm(true)} />
        </>}
      {auth.busy && <ActivityIndicator accessibilityLabel="탈퇴 처리 확인 중" color={GameColors.ink} />}
      {error && <Text accessibilityRole="alert" style={styles.body}>{error}</Text>}{notice && status === 'idle' && <Text accessibilityLiveRegion="polite" style={styles.body}>{notice}</Text>}
    </GameCard>
    {status === 'deleted' ? <GameButton label="로그인으로" onPress={() => router.replace('/login')} /> : <GameButton variant="secondary" label="마이로 돌아가기" disabled={auth.busy} onPress={() => router.dismissTo('/mypage')} />}
    <GameConfirmDialog visible={confirm} title="이 계정을 탈퇴할까요?" message={`${auth.state.user?.nickname ?? ''} 계정과 개인 기록이 삭제되고 모든 동아리에서 탈퇴해요. 작성한 공지·방명록은 작성자 없이 남아요.`} confirmLabel="계정 삭제 확인" confirmDisabled={auth.busy} onConfirm={() => { void run(auth.deleteAccount); }} onCancel={() => setConfirm(false)} />
  </GameScreen>;
}
const styles = StyleSheet.create({ body: { ...GameUi.typography.body, color: GameColors.ink }, account: { ...GameUi.typography.body, color: GameColors.ink, fontWeight: '800' } });
