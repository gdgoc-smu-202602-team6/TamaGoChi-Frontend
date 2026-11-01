export function validateEmail(email: string): string | null {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? null : '이메일 주소를 확인해 주세요.';
}

function graphemeLength(value: string): number | undefined {
  // Servers validate graphemes too. Do not reject valid emoji names on runtimes without Segmenter.
  return typeof Intl.Segmenter === 'function' ? [...new Intl.Segmenter('ko', { granularity: 'grapheme' }).segment(value)].length : undefined;
}

export function validateNickname(value: string): string | null {
  const name = value.trim();
  if (!name || (graphemeLength(name) ?? 1) > 10) return '닉네임은 1~10자로 입력해 주세요.';
  return null;
}

export function validateNewPassword(password: string): string | null {
  if ((graphemeLength(password) ?? password.length) < 8 || password.length > 128 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password) || !/[ !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/.test(password)) return '비밀번호는 8~128자로 영문·숫자·특수문자를 포함해 주세요.';
  return null;
}
