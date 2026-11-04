import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SettingsRow, SettingsSection } from '@/components/ui/settings-section';
import { GameColors } from '@/constants/theme';
import { useClubs } from '@/state/club-context';
import { useGameServices } from '@/state/game-services';
import type { ClubPermission } from '@/types/club-admin';
import { settingsStyles as styles } from './settings-screen';

const groups = [
  { title: '공지', rows: [
    { permission: 'notices.write', title: '공지 쓰기', icon: 'plus', pathname: '/clubs/[clubId]/notices/compose' },
    { permission: 'noticeCategories.manage', title: '공지 분류 관리', icon: 'folder', pathname: '/clubs/[clubId]/notice-categories' },
  ] },
  { title: '동아리 운영', rows: [
    { permission: 'applications.decide', title: '가입 신청 관리', icon: 'person', pathname: '/clubs/[clubId]/applications' },
    { permission: 'members.manage', title: '부원·역할 관리', icon: 'group', pathname: '/clubs/[clubId]/members' },
    { permission: 'parts.manage', title: '파트 관리', icon: 'folder', pathname: '/clubs/[clubId]/parts' },
    { permission: 'club.update', title: '동아리 기본 설정', icon: 'settings', pathname: '/clubs/[clubId]/settings' },
  ] },
] as const;
type ManagementRow = typeof groups[number]['rows'][number];

export function ClubManagementScreen({ clubId }: { clubId: string }) {
  const clubs = useClubs(), club = clubs.clubs.find(one => one.id === clubId), { clubAdmin } = useGameServices();
  const [permissions, setPermissions] = useState<readonly ClubPermission[] | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState<string | null>(null);
  const alive = useRef(true), version = useRef(0), opening = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const read = useCallback(async () => {
    const request = ++version.current;
    setLoading(true); setPermissions(null); setError(null);
    try {
      const next = await clubAdmin.getPermissions(clubId);
      if (!alive.current || version.current !== request) return null;
      setPermissions(next); return next;
    } catch {
      if (alive.current && version.current === request) setError('동아리 설정을 확인하지 못했어요. 다시 확인해 주세요.');
      return null;
    } finally { if (alive.current && version.current === request) setLoading(false); }
  }, [clubAdmin, clubId]);
  useFocusEffect(useCallback(() => {
    if (club) void read(); else { setPermissions(null); setLoading(false); }
    const sub = AppState.addEventListener('change', state => { if (state === 'active' && club) void read(); });
    return () => { version.current++; sub.remove(); };
  }, [read, club]));
  async function open(row: ManagementRow) {
    if (opening.current) return;
    opening.current = true;
    try { const current = await read(); if (current?.includes(row.permission)) router.push({ pathname: row.pathname, params: { clubId } }); }
    finally { opening.current = false; }
  }
  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.content}>
    <ScreenHeader title={club?.name ?? '동아리 설정'} onBack={() => router.canGoBack() ? router.back() : router.dismissTo('/settings')} />
    {loading && <ActivityIndicator color={GameColors.accent} accessibilityLabel="설정 권한 확인 중" />}
    {clubs.status === 'loading' && <ActivityIndicator color={GameColors.accent} accessibilityLabel="동아리 확인 중" />}
    {clubs.error && <><Text accessibilityRole="alert" style={styles.error}>{clubs.error}</Text><SettingsRow title="동아리 다시 확인" icon="refresh" onPress={() => { void clubs.refresh(); }} /></>}
    {clubs.status === 'ready' && !club && <Text style={styles.error}>이 동아리의 설정에 접근할 수 없어요.</Text>}
    {error && <><Text accessibilityRole="alert" style={styles.error}>{error}</Text><SettingsRow title="설정 다시 확인" icon="refresh" onPress={() => { void read(); }} /></>}
    {club && permissions && <>
      {groups.map(group => { const rows = group.rows.filter(row => permissions.includes(row.permission)); return rows.length ? <SettingsSection key={group.title} title={group.title}>{rows.map(row => <SettingsRow key={row.permission} title={row.title} icon={row.icon} accessibilityLabel={`${club.name} ${row.title}`} onPress={() => { void open(row); }} />)}</SettingsSection> : null; })}
      <SettingsSection title="내 활동">
        <SettingsRow title="내 소속·알림 설정" icon="notice" onPress={() => router.push({ pathname: '/clubs/[clubId]/preferences', params: { clubId } })} />
        <SettingsRow title="동아리 탈퇴" icon="back" onPress={() => router.push({ pathname: '/clubs/[clubId]/leave', params: { clubId } })} />
      </SettingsSection>
    </>}
  </ScrollView></SafeAreaView>;
}
