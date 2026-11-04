import { RequireAuth } from '@/components/require-auth';
import { ProfileSettingsScreen } from '@/features/settings/profile-settings-screen';
export default function ProfileSettingsRoute() { return <RequireAuth><ProfileSettingsScreen /></RequireAuth>; }
