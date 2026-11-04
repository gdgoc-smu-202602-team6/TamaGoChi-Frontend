// Match exact account boundaries; never clear another account, backend or Mock preview.
export function accountLocalDataKeys(keys: readonly string[], baseUrl: string, userId: string): string[] {
  const scope = `${encodeURIComponent(baseUrl)}/${encodeURIComponent(userId)}`;
  const roots = ['api-study', 'club-selection', 'club-names', 'club-create-intent', 'notice-create-intent', 'guestbook-intent'].map(name => `@tamagochi/${name}/v1/${scope}`);
  return keys.filter(key => roots.some(root => key === root || key.startsWith(`${root}/`)));
}
