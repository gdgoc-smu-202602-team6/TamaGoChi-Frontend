import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { RequireAuth } from '@/components/require-auth';
import { ApplicationReviewScreen } from '@/features/clubs/application-review-screen';

export default function ApplicationReviewRoute() {
  const { clubId } = useLocalSearchParams<{ clubId: string | string[] }>();
  return <RequireAuth>{typeof clubId === 'string' ? <ApplicationReviewScreen key={clubId} clubId={clubId} /> : <Text>동아리를 확인해 주세요.</Text>}</RequireAuth>;
}
