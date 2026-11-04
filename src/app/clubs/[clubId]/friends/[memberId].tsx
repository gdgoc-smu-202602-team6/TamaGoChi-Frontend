import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { RequireAuth } from '@/components/require-auth';
import { FriendRoomScreen } from '@/features/friends/friend-room-screen';
export default function FriendRoomRoute() { const { clubId, memberId } = useLocalSearchParams<{ clubId: string | string[]; memberId: string | string[] }>(); return <RequireAuth>{typeof clubId === 'string' && typeof memberId === 'string' ? <FriendRoomScreen key={`${clubId}/${memberId}`} clubId={clubId} memberId={memberId} /> : <Text>친구의 방을 확인해 주세요.</Text>}</RequireAuth>; }
