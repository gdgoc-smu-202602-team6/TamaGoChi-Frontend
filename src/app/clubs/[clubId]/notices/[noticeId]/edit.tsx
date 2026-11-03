import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { RequireAuth } from '@/components/require-auth';
import { NoticeEditScreen } from '@/features/notices/notice-edit-screen';

export default function NoticeEditRoute() {
  const { clubId, noticeId } = useLocalSearchParams<{ clubId: string | string[]; noticeId: string | string[] }>();
  return <RequireAuth>{typeof clubId === 'string' && typeof noticeId === 'string' ? <NoticeEditScreen key={`${clubId}/${noticeId}`} clubId={clubId} noticeId={noticeId} /> : <Text>공지와 동아리를 확인해 주세요.</Text>}</RequireAuth>;
}
