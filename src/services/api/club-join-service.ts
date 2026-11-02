import { ClubJoinError, type ClubApplication, type ClubJoinService, type ClubNameStore, type ClubPart, type ClubPreview } from '../../types/club-join';
import { paletteColors, type NoticeService } from '../../types/notice';
import { normalizeInviteCode, validInviteCode } from '../../utils/club-join';
import { isDateTime, isSessionId as isId } from './game-dto';
import { ApiError, type HttpClient } from './http-client';

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError('response');
  return value as Record<string, unknown>;
}
function identifier(value: unknown): string { if (!isId(value)) throw new ApiError('response'); return value; }
function text(value: unknown): string { if (typeof value !== 'string' || !value.trim()) throw new ApiError('response'); return value; }
function page(value: unknown) {
  const data = object(value);
  if (!Array.isArray(data.items) || (data.nextPageToken !== undefined && (typeof data.nextPageToken !== 'string' || !data.nextPageToken))) throw new ApiError('response');
  return data as { items: unknown[]; nextPageToken?: string };
}
function parts(value: unknown): ClubPart[] {
  if (!Array.isArray(value)) throw new ApiError('response');
  const result = value.map(value => {
    const data = object(value);
    if (!paletteColors.includes(data.color as ClubPart['color'])) throw new ApiError('response');
    return { id: identifier(data.id), name: text(data.name), color: data.color as ClubPart['color'] };
  });
  if (new Set(result.map(part => part.id)).size !== result.length) throw new ApiError('response');
  return result;
}
function preview(value: unknown): ClubPreview {
  const data = object(value);
  if (!Number.isSafeInteger(data.memberCount) || (data.memberCount as number) < 0) throw new ApiError('response');
  return { id: identifier(data.id), name: text(data.name), memberCount: data.memberCount as number, parts: parts(data.parts) };
}

export function createApiClubJoinService(client: HttpClient, memberships: Pick<NoticeService, 'listMyClubs'>, userId: string, names?: ClubNameStore): ClubJoinService {
  const known = new Map<string, ClubPreview>();
  let loadingNames: Promise<void> | undefined;
  function loadNames() {
    return loadingNames ??= (async () => {
      try {
        const raw = await names?.get();
        if (!raw) return;
        const value: unknown = JSON.parse(raw);
        if (!Array.isArray(value)) return;
        for (const one of value.map(preview)) known.set(one.id, one);
      } catch { /* Optional display metadata never determines membership or application status. */ }
    })();
  }
  function application(value: unknown): ClubApplication {
    const data = object(value), id = identifier(data.id), clubId = identifier(data.clubId);
    if (data.userId !== userId || !['PENDING', 'APPROVED', 'REJECTED'].includes(data.state as string) || !isDateTime(data.createdAt)
      || (data.decidedAt !== undefined && !isDateTime(data.decidedAt)) || (data.partId !== null && !isId(data.partId)) || (data.state === 'PENDING' && data.partId === null)) throw new ApiError('response');
    const cached = known.get(clubId);
    return { id, clubId, partId: data.partId as string | null, state: data.state as ClubApplication['state'], createdAt: data.createdAt,
      decidedAt: data.decidedAt as string | undefined, clubName: cached?.name, partName: cached?.parts.find(part => part.id === data.partId)?.name };
  }
  async function listApplications(): Promise<ClubApplication[]> {
    await loadNames();
    const result: ClubApplication[] = [], seenTokens = new Set<string>(), seenIds = new Set<string>();
    let token: string | undefined;
    do {
      const response = await client.request(`/clubs/-/applications?userId=me&pageSize=200${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`), data = page(response.data);
      for (const value of data.items) { const one = application(value); if (seenIds.has(one.id)) throw new ApiError('response'); seenIds.add(one.id); result.push(one); }
      token = data.nextPageToken;
      if (token && seenTokens.has(token)) throw new ApiError('response');
      if (token) seenTokens.add(token);
    } while (token);
    return result;
  }
  const base = (clubId: string) => `/clubs/${identifier(clubId)}`;
  function conflict(error: unknown): never {
    if (error instanceof ApiError) {
      if (error.status === 409 && error.code === 'already-member') throw new ClubJoinError('already-member');
      if (error.status === 409 && error.code === 'application-pending') throw new ClubJoinError('pending');
      if (error.status === 409 && error.code === 'not-pending') throw new ClubJoinError('not-pending');
      if (error.status === 404) throw new ClubJoinError('not-found');
    }
    throw error;
  }
  return {
    async getOverview() {
      const [applications, clubs] = await Promise.all([listApplications(), memberships.listMyClubs()]);
      return { clubs, applications: applications.map(one => ({ ...one, clubName: clubs.find(club => club.id === one.clubId)?.name ?? one.clubName })) };
    },
    async findClub(code) {
      const normalized = normalizeInviteCode(code);
      if (!validInviteCode(normalized)) throw new ClubJoinError('invalid-code');
      const data = page((await client.request(`/clubs?inviteCode=${normalized}`)).data);
      if (data.items.length > 1) throw new ApiError('response');
      if (!data.items.length) return null;
      const found = preview(data.items[0]);
      const currentParts = parts(page((await client.request(`${base(found.id)}/parts`)).data).items);
      const current = { ...found, parts: currentParts };
      await loadNames(); known.set(current.id, current);
      try { await names?.set(JSON.stringify([...known.values()])); } catch { /* Display metadata is optional; do not turn a valid lookup into a failed application. */ }
      return current;
    },
    async apply(clubId, partId) {
      const path = base(clubId); identifier(partId);
      const pending = (await listApplications()).find(one => one.clubId === clubId && one.state === 'PENDING');
      if (pending) return pending;
      const currentParts = parts(page((await client.request(`${path}/parts`)).data).items);
      if (!currentParts.some(part => part.id === partId)) throw new ClubJoinError('part-missing');
      try {
        const created = application((await client.request(`${path}/applications`, { method: 'POST', body: { partId } })).data);
        if (created.clubId !== clubId || created.partId !== partId || created.state !== 'PENDING') throw new ApiError('response');
        return created;
      } catch (error) { return conflict(error); }
    },
    async cancel(clubId, applicationId) {
      const path = `${base(clubId)}/applications/${identifier(applicationId)}`;
      let current: ClubApplication;
      try { current = application((await client.request(path)).data); }
      catch (error) { if (error instanceof ApiError && error.status === 404) return 'missing'; throw error; }
      if (current.id !== applicationId || current.clubId !== clubId) throw new ApiError('response');
      if (current.state !== 'PENDING') throw new ClubJoinError('not-pending');
      try { await client.request(path, { method: 'DELETE' }); return 'cancelled'; }
      catch (error) { return conflict(error); }
    },
  };
}
