import { RequireAuth } from '@/components/require-auth';
import { ClubJoinScreen } from '@/features/clubs/club-join-screen';

export default function ClubJoinRoute() { return <RequireAuth><ClubJoinScreen /></RequireAuth>; }
