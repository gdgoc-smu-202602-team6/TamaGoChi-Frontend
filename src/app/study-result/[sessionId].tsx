import { RequireAuth } from '@/components/require-auth';
import { StudyResultScreen } from '@/features/study/study-result-screen';

export default function ResultRoute() { return <RequireAuth><StudyResultScreen /></RequireAuth>; }
