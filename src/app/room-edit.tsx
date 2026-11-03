import { RequireAuth } from '@/components/require-auth';
import { RoomEditScreen } from '@/features/room/room-edit-screen';

export default function RoomEditRoute() { return <RequireAuth><RoomEditScreen /></RequireAuth>; }
