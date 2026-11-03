import { RequireAuth } from '@/components/require-auth';
import { ClubCreateScreen } from '@/features/clubs/club-create-screen';

export default function ClubCreateRoute() { return <RequireAuth><ClubCreateScreen /></RequireAuth>; }
