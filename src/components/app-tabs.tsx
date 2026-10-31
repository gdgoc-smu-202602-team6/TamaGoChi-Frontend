import { NativeTabs } from 'expo-router/native-tabs';
import { Platform } from 'react-native';
import { GameColors } from '@/constants/theme';

export default function AppTabs() {
  return (
    <NativeTabs
      backgroundColor={GameColors.ink}
      indicatorColor={GameColors.yellow}
      backBehavior="initialRoute"
      labelVisibilityMode="labeled"
      iconColor={{ default: GameColors.skyLight, selected: Platform.OS === 'android' ? GameColors.ink : GameColors.yellow }}
      labelStyle={{
        default: { color: GameColors.skyLight },
        selected: { color: GameColors.yellow },
      }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>내 방</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="notice">
        <NativeTabs.Trigger.Label>공지</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="bell.fill" md="notifications" />
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
