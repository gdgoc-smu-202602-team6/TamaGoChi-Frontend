import { Modal, StyleSheet, Text, View } from 'react-native';
import { GameColors, GameUi } from '@/constants/theme';
import { GameButton } from './game-button';
import { GameCard } from './game-card';

export function GameConfirmDialog({ visible, title, message, confirmLabel, confirmDisabled, onConfirm, onCancel }: { visible: boolean; title: string; message: string; confirmLabel: string; confirmDisabled?: boolean; onConfirm: () => void; onCancel: () => void }) {
  return <Modal transparent visible={visible} onRequestClose={onCancel} animationType="fade">
    <View style={styles.backdrop}><GameCard style={styles.card} contentStyle={styles.surface}>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text><Text style={styles.body}>{message}</Text>
      <GameButton label={confirmLabel} disabled={confirmDisabled} onPress={onConfirm} /><GameButton variant="secondary" label="취소" onPress={onCancel} />
    </GameCard></View>
  </Modal>;
}
/** One-button notice using the same card as the confirm dialog. */
export function GameInfoDialog({ visible, title, message, onClose }: { visible: boolean; title: string; message: string; onClose: () => void }) {
  return <Modal transparent visible={visible} onRequestClose={onClose} animationType="fade">
    <View style={styles.backdrop}><GameCard style={styles.card} contentStyle={styles.surface}>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text><Text style={styles.body}>{message}</Text>
      <GameButton label="확인" onPress={onClose} />
    </GameCard></View>
  </Modal>;
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 18, backgroundColor: 'rgba(28, 27, 57, 0.55)' }, card: { width: '100%', maxWidth: GameUi.contentWidth }, surface: { backgroundColor: GameColors.cream },
  title: { ...GameUi.typography.title, color: GameColors.ink }, body: { ...GameUi.typography.body, color: GameColors.ink },
});
