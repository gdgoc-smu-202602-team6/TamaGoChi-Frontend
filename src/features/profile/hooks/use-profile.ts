import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { apiErrorMessage } from '@/services/api/http-client';
import { useGameServices } from '@/state/game-services';
import { GoalError, type ProfileOverview } from '@/types/profile';
import { goalErrorText, validGoalMinutes } from '@/utils/profile';

export function useProfile() {
  const { profile: service } = useGameServices();
  const [data, setData] = useState<ProfileOverview | null>(null);
  const [refreshing, setRefreshing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unverified, setUnverified] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const mounted = useRef(true), version = useRef(0), busy = useRef(false), verified = useRef(false);
  const snapshot = useRef<ProfileOverview | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const refresh = useCallback(async () => {
    if (busy.current) return;
    const request = ++version.current;
    verified.current = false; setRefreshing(true);
    try {
      const next = await service.getProfile();
      if (!mounted.current || request !== version.current) return;
      snapshot.current = next; verified.current = true;
      setData(next); setUnverified(false); setError(null);
    } catch {
      if (mounted.current && request === version.current) {
        setUnverified(true); setError('마이 정보를 확인하지 못했어요. 다시 불러온 뒤 목표를 변경해 주세요.');
      }
    } finally {
      if (mounted.current && request === version.current) setRefreshing(false);
    }
  }, [service]);

  useFocusEffect(useCallback(() => {
    void refresh();
    const subscription = AppState.addEventListener('change', status => { if (status === 'active') void refresh(); });
    const timer = setInterval(() => { if (AppState.currentState === 'active') void refresh(); }, 60000);
    return () => { subscription.remove(); clearInterval(timer); };
  }, [refresh]));

  const saveGoal = useCallback(async (minutes: number) => {
    const current = snapshot.current;
    if (busy.current || !verified.current || !current || !validGoalMinutes(minutes) || current.scheduledGoals.some(goal => goal.startOn === current.tomorrow)) return;
    busy.current = true; verified.current = false;
    const request = ++version.current, startOn = current.tomorrow;
    setSaving(true); setRefreshing(false); setError(null); setNotice(null);
    let failure: unknown;
    try { await service.createGoal(minutes, startOn); } catch (reason) { failure = reason; }
    if (!mounted.current || request !== version.current) return;
    try {
      const next = await service.getProfile();
      if (!mounted.current || request !== version.current) return;
      snapshot.current = next; verified.current = true;
      setData(next); setUnverified(false);
      if (next.scheduledGoals.some(goal => goal.startOn === startOn && goal.minutes === minutes)) setNotice(`${startOn} 한국시간 오전 4시부터 적용할 목표 ${minutes}분을 확인했어요.`);
      else if (failure) setError(failure instanceof GoalError ? goalErrorText(failure) : apiErrorMessage(failure));
      else {
        verified.current = false; setUnverified(true);
        setError('목표 예약을 확인하지 못했어요. 다시 불러와 예약 내용을 확인해 주세요.');
      }
    } catch {
      if (mounted.current && request === version.current) {
        setUnverified(true); setError('저장 결과를 확인해야 해요. 다시 불러오기로 예약 내용을 확인해 주세요.');
      }
    } finally {
      busy.current = false;
      if (mounted.current && request === version.current) setSaving(false);
    }
  }, [service]);
  return { data, refreshing, saving, unverified, error, notice, refresh, saveGoal };
}
