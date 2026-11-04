import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { RequireAuth } from '@/components/require-auth';
import { ClubPreferencesScreen } from '@/features/settings/club-preferences-screen';
export default function ClubPreferencesRoute() { const { clubId } = useLocalSearchParams<{ clubId: string | string[] }>(); return <RequireAuth>{typeof clubId === 'string' ? <ClubPreferencesScreen key={clubId} clubId={clubId} /> : <Text>동아리를 확인해 주세요.</Text>}</RequireAuth>; }
