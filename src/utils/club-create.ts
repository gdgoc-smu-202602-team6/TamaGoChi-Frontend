import { ClubCreateError, type ClubCreateInput } from '../types/club-create';
import { paletteColors } from '../types/notice';

function within(value: string, limit: number) {
  const trimmed = value.trim();
  const length = typeof Intl.Segmenter === 'function'
    ? [...new Intl.Segmenter('ko', { granularity: 'grapheme' }).segment(trimmed)].length : undefined;
  // The server remains authoritative on platforms without Segmenter.
  return !!trimmed && (length === undefined || length <= limit);
}
export function validateClubCreate(input: ClubCreateInput): string | null {
  if (!within(input.name, 20)) return '동아리 이름은 1~20자로 입력해 주세요.';
  if (!input.parts.length) return '파트를 한 개 이상 추가해 주세요.';
  if (input.parts.some(part => !within(part.name, 10))) return '파트 이름은 각각 1~10자로 입력해 주세요.';
  if (new Set(input.parts.map(part => part.name.trim())).size !== input.parts.length) return '같은 이름의 파트를 두 번 추가할 수 없어요.';
  if (input.parts.some(part => !paletteColors.includes(part.color))) return '파트 색상을 선택해 주세요.';
  if (!input.parts.some(part => part.name.trim() === input.myPartName.trim())) return '내 소속 파트를 선택해 주세요.';
  return null;
}
export function normalizeClubCreate(input: ClubCreateInput): ClubCreateInput {
  if (validateClubCreate(input)) throw new ClubCreateError('invalid-input');
  return { name: input.name.trim(), parts: input.parts.map(part => ({ name: part.name.trim(), color: part.color })), myPartName: input.myPartName.trim() };
}
