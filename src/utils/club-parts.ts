import { ClubPartsError, type ClubPartAction, type ClubPartsBoard } from '../types/club-parts';
import { paletteColors } from '../types/notice';
import { noticeCharacterCount } from './notice-compose';

export function normalizePartAction(action: ClubPartAction): ClubPartAction {
  if (action.kind === 'delete') return action;
  if (typeof action.name !== 'string' || !action.name.trim() || (noticeCharacterCount(action.name) ?? 0) > 10 || !paletteColors.includes(action.color)) throw new ClubPartsError('invalid');
  return { ...action, name: action.name.trim() };
}
export function preparePartAction(board: ClubPartsBoard, action: ClubPartAction) {
  if (action.kind === 'add') { if (board.parts.some(one => one.name === action.name)) throw new ClubPartsError('duplicate'); return true; }
  const part = board.parts.find(one => one.id === action.part.id);
  if (!part) return false;
  if (part.name !== action.part.name || part.color !== action.part.color) throw new ClubPartsError('changed');
  return true;
}
export function partActionConfirmed(board: ClubPartsBoard, action: ClubPartAction) {
  return action.kind === 'add' ? board.parts.some(one => one.name === action.name.trim() && one.color === action.color) : !board.parts.some(one => one.id === action.part.id);
}
