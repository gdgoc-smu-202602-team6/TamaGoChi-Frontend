import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { RequireAuth } from '@/components/require-auth';
import { NoticeCategoriesScreen } from '@/features/notices/notice-categories-screen';

export default function NoticeCategoriesRoute() {
  const { clubId } = useLocalSearchParams<{ clubId: string | string[] }>();
  return <RequireAuth>{typeof clubId === 'string' ? <NoticeCategoriesScreen key={clubId} clubId={clubId} /> : <Text>동아리를 확인해 주세요.</Text>}</RequireAuth>;
}
