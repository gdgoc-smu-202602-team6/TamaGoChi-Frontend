import { NativeTabs } from 'expo-router/native-tabs';
import { GameColors } from '@/constants/theme';
import { useSelectedNoticeUnread } from '@/state/notice-unread-context';
import { unreadBadge, unreadDescription } from '@/utils/notice-unread';

export default function AppTabs() {
  const unread = useSelectedNoticeUnread(), badge = unreadBadge(unread.count);
  return (
    <NativeTabs
      backgroundColor={GameColors.paper}
      indicatorColor={GameColors.skyLight}
      badgeBackgroundColor={GameColors.coral}
      badgeTextColor={GameColors.paper}
      backBehavior="initialRoute"
      labelVisibilityMode="labeled"
      iconColor={{ default: GameColors.inkMuted, selected: GameColors.accent }}
      labelStyle={{
        default: { color: GameColors.inkMuted },
        selected: { color: GameColors.accent },
      }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>내 방</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="notice" accessibilityLabel={unread.club ? `공지, ${unreadDescription(unread.club.name, unread.count)}` : '공지'}>
        <NativeTabs.Trigger.Label>공지</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="bell.fill" md="notifications" />
        <NativeTabs.Trigger.Badge hidden={!badge}>{badge}</NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="shop">
        <NativeTabs.Trigger.Label>상점</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="bag.fill" md="shopping_bag" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="mypage">
        <NativeTabs.Trigger.Label>마이</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.fill" md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
