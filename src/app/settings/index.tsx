import { RequireAuth } from '@/components/require-auth';
import { SettingsScreen } from '@/features/settings/settings-screen';
export default function SettingsRoute() { return <RequireAuth><SettingsScreen /></RequireAuth>; }
