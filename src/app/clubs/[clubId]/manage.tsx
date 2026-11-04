import { useLocalSearchParams } from 'expo-router';
import { RequireAuth } from '@/components/require-auth';
import { ClubManagementScreen } from '@/features/settings/club-management-screen';
export default function ClubManagementRoute() {
  const { clubId } = useLocalSearchParams<{ clubId?: string | string[] }>();
  return <RequireAuth><ClubManagementScreen key={typeof clubId === 'string' ? clubId : ''} clubId={typeof clubId === 'string' ? clubId : ''} /></RequireAuth>;
}
