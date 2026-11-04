import { RequireAuth } from '@/components/require-auth';
import { GuestbookScreen } from '@/features/guestbook/guestbook-screen';
export default function GuestbookRoute() { return <RequireAuth><GuestbookScreen /></RequireAuth>; }
