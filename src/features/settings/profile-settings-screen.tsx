import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { GameButton } from '@/components/ui/game-button';
import { GameCard } from '@/components/ui/game-card';
import { GameInput } from '@/components/ui/game-input';
import { GameColors, GameUi } from '@/constants/theme';
import { validateNickname } from '@/utils/auth-validation';
import { useAccountSettings } from './hooks/use-personal-settings';
import { SettingsFrame } from './settings-frame';

export function ProfileSettingsScreen() { const manager = useAccountSettings(); return <ProfileSettingsContent key={manager.data ? 'loaded' : 'unavailable'} manager={manager} />; }
function ProfileSettingsContent({ manager }: { manager: ReturnType<typeof useAccountSettings> }) {
  const [baseline, setBaseline] = useState(manager.data), [nickname, setNickname] = useState(manager.data?.nickname ?? '');
  const dirty = !!baseline && nickname !== baseline.nickname, disabled = !!manager.operation || !manager.verified;
  return <SettingsFrame title="닉네임 설정" saving={manager.operation === 'save'} dirty={dirty} operation={manager.operation} error={manager.error} notice={manager.notice} onRefresh={() => { void manager.refresh(); }}>
    {manager.data && <GameCard><Text style={styles.body}>닉네임은 내 방과 모든 동아리에서 함께 사용해요.</Text><Text style={styles.body}>현재 닉네임: {manager.data.nickname}</Text><GameInput label="닉네임" hint="1~10자 · 같은 닉네임도 사용할 수 있어요." value={nickname} onChangeText={setNickname} editable={!disabled} autoCorrect={false} />
      <GameButton label="닉네임 저장" disabled={disabled || !baseline || !!validateNickname(nickname) || nickname.trim() === baseline.nickname} onPress={() => { if (baseline) void manager.save(baseline, nickname).then(next => { if (next) { setBaseline(next); setNickname(next.nickname); } }); }} />
      <GameButton variant="secondary" label="현재 값으로 입력" disabled={disabled} onPress={() => { setBaseline(manager.data); setNickname(manager.data!.nickname); }} />
    </GameCard>}
  </SettingsFrame>;
}
const styles = StyleSheet.create({ body: { ...GameUi.typography.body, color: GameColors.ink } });
