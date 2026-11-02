import type { ClubJoinError } from '../types/club-join';

export const normalizeInviteCode = (value: string) => value.trim().toUpperCase();
export const validInviteCode = (value: string) => /^[A-Z0-9]{8}$/.test(value);
export function clubJoinErrorText(error: ClubJoinError): string {
  if (error.reason === 'invalid-code') return '초대 코드는 영문 대문자와 숫자로 된 8자리예요.';
  if (error.reason === 'part-missing') return '선택한 파트가 바뀌었어요. 동아리를 다시 찾아 파트를 선택해 주세요.';
  if (error.reason === 'already-member') return '이미 가입한 동아리예요. 가입한 동아리 목록을 확인해 주세요.';
  if (error.reason === 'pending') return '이미 승인 대기 중인 신청이 있어요. 내 신청 내역을 확인해 주세요.';
  if (error.reason === 'not-pending') return '운영진이 이미 처리한 신청이에요. 현재 상태를 확인해 주세요.';
  if (error.reason === 'not-found') return '동아리 또는 신청을 찾지 못했어요. 초대 코드와 신청 내역을 다시 확인해 주세요.';
  return '신청 상태를 저장하지 못했어요. 다시 불러와 현재 상태를 확인해 주세요.';
}
