import { RequireAuth } from '@/components/require-auth';
import { AppBlockingScreen } from '@/features/app-blocking/app-blocking-screen';

export default function AppBlockingRoute() { return <RequireAuth><AppBlockingScreen /></RequireAuth>; }
