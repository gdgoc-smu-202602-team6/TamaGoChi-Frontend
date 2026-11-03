import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GameButton } from '@/components/ui/game-button';
import { GameInput } from '@/components/ui/game-input';
import { Palette, PaletteLabels as colorLabels } from '@/constants/palette';
import { GameColors, GameUi } from '@/constants/theme';
import { paletteColors, type PaletteColor } from '@/types/notice';

export type DraftPart = { key: number; name: string; color: PaletteColor };
export function PartEditor({ part, index, disabled, removable, onChange, onRemove }: {
  part: DraftPart; index: number; disabled: boolean; removable: boolean;
  onChange: (next: DraftPart) => void; onRemove: () => void;
}) {
  return <View style={styles.card}>
    <GameInput label={`파트 ${index + 1} 이름`} hint="1~10자 · 다른 파트와 겹치지 않게 입력해 주세요." value={part.name} editable={!disabled} autoCorrect={false} onChangeText={name => onChange({ ...part, name })} />
    <View accessibilityRole="radiogroup" accessibilityLabel={`파트 ${index + 1} 색상`} style={styles.colors}>
      {paletteColors.map(color => <Pressable key={color} disabled={disabled} accessibilityRole="radio" accessibilityLabel={`파트 ${index + 1} ${colorLabels[color]}`} accessibilityState={{ checked: color === part.color, disabled }}
        onPress={() => onChange({ ...part, color })} style={[styles.color, { backgroundColor: Palette[color].background }]}>
        <Text style={[styles.colorText, { color: Palette[color].text }]}>{color === part.color ? '✓ ' : ''}{colorLabels[color]}</Text>
      </Pressable>)}
    </View>
    <GameButton compact variant="secondary" label="파트 삭제" accessibilityLabel={`파트 ${index + 1} 삭제`} disabled={disabled || !removable} onPress={onRemove} />
  </View>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: GameColors.paper, borderWidth: GameUi.borderWidth, borderColor: GameColors.ink, borderRadius: GameUi.radius.button, padding: 12, gap: 12 },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  color: { minHeight: 44, minWidth: 56, paddingHorizontal: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: GameColors.ink, borderRadius: 12 },
  colorText: { ...GameUi.typography.caption, fontWeight: '800' },
});
