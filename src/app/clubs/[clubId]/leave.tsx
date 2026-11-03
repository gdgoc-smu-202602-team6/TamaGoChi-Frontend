import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { RequireAuth } from '@/components/require-auth';
import { ClubLeaveScreen } from '@/features/clubs/club-leave-screen';

export default function ClubLeaveRoute() { const { clubId } = useLocalSearchParams<{ clubId: string | string[] }>(); return <RequireAuth>{typeof clubId === 'string' ? <ClubLeaveScreen key={clubId} clubId={clubId} /> : <Text>동아리를 확인해 주세요.</Text>}</RequireAuth>; }
