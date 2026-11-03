import { ClubSettingsError, type ClubSettings, type ClubSettingsAction } from '../types/club-settings';
import { noticeCharacterCount } from './notice-compose';

export function normalizeSettingsAction(action: ClubSettingsAction): ClubSettingsAction {
  if (action.kind !== 'rename') return action;
  if (typeof action.name !== 'string' || !action.name.trim() || (noticeCharacterCount(action.name) ?? 0) > 20) throw new ClubSettingsError('invalid');
  return { ...action, name: action.name.trim() };
}
export function sameClubSettings(a: ClubSettings, b: ClubSettings) {
  return a.id === b.id && a.name === b.name && a.inviteCode === b.inviteCode && (!a.etag || !b.etag || a.etag === b.etag);
}
export function settingsActionConfirmed(club: ClubSettings, action: ClubSettingsAction) {
  return club.id === action.expected.id && (action.kind === 'rename' ? club.name === action.name.trim() : club.inviteCode !== action.expected.inviteCode);
}
