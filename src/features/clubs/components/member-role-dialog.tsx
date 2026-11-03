import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GameButton } from '@/components/ui/game-button';
import { GameCard } from '@/components/ui/game-card';
import { ClubPermissionLabels } from '@/constants/club-permissions';
import { GameColors, GameUi } from '@/constants/theme';
import type { ClubMember, ClubRole, MemberRoleChange } from '@/types/club-members';

export function MemberRoleDialog({ member, roles, isMe, disabled, onConfirm, onCancel }: { member: ClubMember; roles: readonly ClubRole[]; isMe: boolean; disabled: boolean; onConfirm: (action: MemberRoleChange) => void; onCancel: () => void }) {
  const [selected, setSelected] = useState(member.roleId), role = roles.find(one => one.id === selected);
  return <Modal transparent visible onRequestClose={onCancel} animationType="fade">
    <View style={styles.backdrop}><GameCard style={styles.card} contentStyle={styles.surface}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={styles.title}>부원 역할 변경</Text><Text style={styles.body}>{member.nickname || '닉네임 정보 없음'}{isMe ? ' · 나' : ''}</Text>
        <Text style={styles.body}>현재 역할: {roles.find(one => one.id === member.roleId)?.name ?? '역할 정보 없음'}</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel="변경할 역할" style={styles.options}>
          {roles.map(one => <Pressable key={one.id} accessibilityRole="radio" accessibilityLabel={`역할 ${one.name}`} accessibilityState={{ checked: one.id === selected, disabled }} disabled={disabled} onPress={() => setSelected(one.id)} style={[styles.option, { backgroundColor: one.id === selected ? GameColors.yellow : GameColors.paper }]}><Text style={styles.body}>{one.id === selected ? '✓ ' : ''}{one.name}</Text></Pressable>)}
        </View>
        {role && <><Text style={styles.label}>선택한 역할의 권한</Text><Text style={styles.body}>{role.permissions.length ? role.permissions.map(one => `• ${ClubPermissionLabels[one]}`).join('\n') : '관리 권한 없음'}</Text></>}
        {isMe && <Text style={styles.body}>내 역할을 바꾸면 이용 가능한 관리 기능도 바뀝니다.</Text>}
        <GameButton label="역할 변경 확인" disabled={disabled || !role} onPress={() => { if (role) onConfirm({ member, role }); }} />
        <GameButton variant="secondary" label="취소" onPress={onCancel} />
      </ScrollView>
    </GameCard></View>
  </Modal>;
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, padding: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(28, 27, 55, 0.6)' }, card: { width: '100%', maxWidth: GameUi.contentWidth, maxHeight: '90%', flexShrink: 1 }, surface: { backgroundColor: GameColors.cream, padding: 0, gap: 0, flexShrink: 1 }, content: { padding: 16, gap: 14 },
  title: { ...GameUi.typography.title, color: GameColors.ink }, body: { ...GameUi.typography.body, color: GameColors.ink }, label: { ...GameUi.typography.body, color: GameColors.ink, fontWeight: '800' }, options: { gap: 8 }, option: { borderWidth: 2, borderColor: GameColors.ink, borderRadius: 14, minHeight: 48, justifyContent: 'center', padding: 12 },
});
