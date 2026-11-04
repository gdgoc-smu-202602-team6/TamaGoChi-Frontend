import { router } from 'expo-router';
import { useRef, useState } from 'react';

import { HomeScreen } from '@/features/home/home-screen';
import { studyErrorMessage } from '@/services/study';
import { useStudy } from '@/state/study-context';

export default function HomeRoute() {
  const { state, operation, revision, startStudy, refresh } = useStudy();
  const [error, setError] = useState<string | null>(null);
  const navigating = useRef(false);

  async function openStudy() {
    if (navigating.current) return;
    navigating.current = true;
    setError(null);
    try {
      if (state.status === 'error') { await refresh(); return; }
      if (state.completedSessionId && !state.session) {
        router.push({ pathname: '/study-result/[sessionId]', params: { sessionId: state.completedSessionId } });
        return;
      }
      if (state.session) { router.push('/study'); return; }
      await startStudy();
      router.push('/study');
    } catch (reason) {
      setError(studyErrorMessage(reason));
    } finally {
      navigating.current = false;
    }
  }

  const label = state.status === 'loading' ? '공부 상태 확인 중…'
    : operation === 'start' ? '공부 시작 중…'
    : state.status === 'error' ? '공부 상태 다시 확인'
    : state.session ? '진행 중인 공부 보기' : state.completedSessionId ? '끝난 공부 결과 확인' : undefined;

  return <HomeScreen
    onEditRoom={() => router.push('/room-edit')}
    onVisitFriends={() => router.push('/friends')}
    onOpenGuestbook={() => router.push('/guestbook')}
    onStartStudy={openStudy}
    refreshKey={revision}
    studyActionLabel={label}
    studyActionDisabled={state.status === 'loading' || operation !== null}
    studyActionError={error ?? state.error}
  />;
}
