import AppTabs from '@/components/app-tabs';
import { RequireAuth } from '@/components/require-auth';

export default function TabLayout() {
  return <RequireAuth><AppTabs /></RequireAuth>;
}
