import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { RequireAuth } from '@/components/require-auth';
import { ClubMembersScreen } from '@/features/clubs/club-members-screen';

export default function ClubMembersRoute() {
  const { clubId } = useLocalSearchParams<{ clubId: string | string[] }>();
  return <RequireAuth>{typeof clubId === 'string' ? <ClubMembersScreen key={clubId} clubId={clubId} /> : <Text>동아리를 확인해 주세요.</Text>}</RequireAuth>;
}
