import { RequireAuth } from '@/components/require-auth';
import { FriendsScreen } from '@/features/friends/friends-screen';
export default function FriendsRoute() { return <RequireAuth><FriendsScreen /></RequireAuth>; }
