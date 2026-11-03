import { ClubAdminError, clubPermissions, type ClubAdminService, type ClubPermission, type ReviewApplication } from '../../types/club-admin';
import type { ClubPart } from '../../types/club-join';
import { paletteColors } from '../../types/notice';
import { isDateTime, isSessionId as isId } from './game-dto';
import { ApiError, type HttpClient } from './http-client';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError('response');
  return value as Record<string, unknown>;
}
function identifier(value: unknown): string { if (!isId(value)) throw new ApiError('response'); return value; }
function text(value: unknown): string { if (typeof value !== 'string' || !value.trim()) throw new ApiError('response'); return value; }
function page(value: unknown) {
  const data = record(value);
  if (!Array.isArray(data.items) || (data.nextPageToken !== undefined && (typeof data.nextPageToken !== 'string' || !data.nextPageToken))) throw new ApiError('response');
  return data as { items: unknown[]; nextPageToken?: string };
}
function application(value: unknown, clubId: string, expectedId?: string): ReviewApplication {
  const data = record(value), id = identifier(data.id);
  if (data.clubId !== clubId || (expectedId && id !== expectedId) || typeof data.userId !== 'string' || !data.userId
    || typeof data.nickname !== 'string' || typeof data.email !== 'string' || !['PENDING', 'APPROVED', 'REJECTED'].includes(data.state as string)
    || !isDateTime(data.createdAt) || (data.decidedAt !== undefined && !isDateTime(data.decidedAt))
    || (data.partId !== null && !isId(data.partId)) || (data.state === 'PENDING' && data.partId === null)) throw new ApiError('response');
  // Contact data is scoped to this authenticated review; it is never written to a client cache.
  return { id, clubId, userId: data.userId, nickname: data.nickname, email: data.email, partId: data.partId as string | null,
    state: data.state as ReviewApplication['state'], createdAt: data.createdAt, decidedAt: data.decidedAt as string | undefined };
}
function accessError(error: unknown): never {
  if (error instanceof ApiError && error.status === 403) throw new ClubAdminError('forbidden');
  if (error instanceof ApiError && error.status === 404) throw new ClubAdminError('not-found');
  throw error;
}
export function createApiClubAdminService(client: HttpClient): ClubAdminService {
  let decisions: Promise<unknown> = Promise.resolve();
  const base = (clubId: string) => `/clubs/${identifier(clubId)}`;
  async function getPermissions(clubId: string): Promise<ClubPermission[]> {
    try {
      const items = page((await client.request(`${base(clubId)}/members/me/permissions`)).data).items;
      if (!items.every(one => clubPermissions.includes(one as ClubPermission)) || new Set(items).size !== items.length) throw new ApiError('response');
      return items as ClubPermission[];
    } catch (error) { return accessError(error); }
  }
  async function requireReview(clubId: string) {
    if (!(await getPermissions(clubId)).includes('applications.decide')) throw new ClubAdminError('forbidden');
  }
  async function getApplication(clubId: string, id: string) {
    try { return application((await client.request(`${base(clubId)}/applications/${identifier(id)}`)).data, clubId, id); }
    catch (error) { return accessError(error); }
  }
  async function decide(clubId: string, id: string, decision: 'APPROVED' | 'REJECTED') {
    if (!['APPROVED', 'REJECTED'].includes(decision)) throw new ClubAdminError('invalid');
    await requireReview(clubId);
    const current = await getApplication(clubId, id);
    if (current.state !== 'PENDING') return current;
    try {
      const next = application((await client.request(`${base(clubId)}/applications/${identifier(id)}`, { method: 'PATCH', body: { state: decision } })).data, clubId, id);
      if (next.state !== decision) throw new ApiError('response');
      return next;
    } catch (error) {
      if (error instanceof ApiError && error.kind === 'http' && error.status && error.status < 500 && error.status !== 408 && !(error.status === 409 && error.code === 'not-pending')) {
        if (error.status === 409 && error.code === 'already-member') throw new ClubAdminError('already-member');
        return accessError(error);
      }
      // A decision may commit before its response or notification fails. Read the final state;
      // never send a second PATCH or claim which operator made the decision.
      try {
        const actual = await getApplication(clubId, id);
        if (actual.state !== 'PENDING') return actual;
      } catch (readError) { if (readError instanceof ClubAdminError) throw readError; }
      throw new ClubAdminError('uncertain');
    }
  }
  return {
    getPermissions,
    async getBoard(clubId) {
      await requireReview(clubId);
      try {
        const [clubResponse, partsResponse] = await Promise.all([client.request(base(clubId)), client.request(`${base(clubId)}/parts`)]);
        const club = record(clubResponse.data);
        if (club.id !== clubId || !Number.isSafeInteger(club.memberCount) || (club.memberCount as number) < 0) throw new ApiError('response');
        const parts: ClubPart[] = page(partsResponse.data).items.map(value => {
          const part = record(value); if (!paletteColors.includes(part.color as ClubPart['color'])) throw new ApiError('response');
          return { id: identifier(part.id), name: text(part.name), color: part.color as ClubPart['color'] };
        });
        if (new Set(parts.map(part => part.id)).size !== parts.length) throw new ApiError('response');
        const applications: ReviewApplication[] = [], seenIds = new Set<string>(), seenTokens = new Set<string>();
        let token: string | undefined;
        do {
          const data = page((await client.request(`${base(clubId)}/applications?state=PENDING&pageSize=200${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`)).data);
          for (const value of data.items) {
            const one = application(value, clubId);
            if (one.state !== 'PENDING' || seenIds.has(one.id)) throw new ApiError('response');
            seenIds.add(one.id); applications.push(one);
          }
          token = data.nextPageToken;
          if (token && seenTokens.has(token)) throw new ApiError('response');
          if (token) seenTokens.add(token);
        } while (token);
        return { club: { id: clubId, name: text(club.name), memberCount: club.memberCount as number }, parts, applications };
      } catch (error) { return accessError(error); }
    },
    decide(clubId, id, decision) {
      const next = decisions.then(() => decide(clubId, id, decision));
      decisions = next.catch(() => undefined);
      return next;
    },
  };
}
