import { RequireAuth } from '@/components/require-auth';
import { StudyGoalScreen } from '@/features/settings/study-goal-screen';
export default function StudyGoalRoute() { return <RequireAuth><StudyGoalScreen /></RequireAuth>; }
