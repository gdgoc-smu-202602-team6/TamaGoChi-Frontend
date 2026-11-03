import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { RequireAuth } from '@/components/require-auth';
import { ClubSettingsScreen } from '@/features/clubs/club-settings-screen';

export default function ClubSettingsRoute() {
  const { clubId } = useLocalSearchParams<{ clubId: string | string[] }>();
  return <RequireAuth>{typeof clubId === 'string' ? <ClubSettingsScreen key={clubId} clubId={clubId} /> : <Text>동아리를 확인해 주세요.</Text>}</RequireAuth>;
}
