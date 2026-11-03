import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { RequireAuth } from '@/components/require-auth';
import { NoticeComposeScreen } from '@/features/notices/notice-compose-screen';

export default function NoticeComposeRoute() {
  const { clubId } = useLocalSearchParams<{ clubId: string | string[] }>();
  return <RequireAuth>{typeof clubId === 'string' ? <NoticeComposeScreen key={clubId} clubId={clubId} /> : <Text>동아리를 확인해 주세요.</Text>}</RequireAuth>;
}
