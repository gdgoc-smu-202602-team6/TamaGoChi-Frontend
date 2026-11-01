import { RequireAuth } from '@/components/require-auth';
import { StudyScreen } from '@/features/study/study-screen';

export default function StudyRoute() { return <RequireAuth><StudyScreen /></RequireAuth>; }
