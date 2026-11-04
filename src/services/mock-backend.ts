import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';

import { mockHomeScenarios } from '@/mocks/home';
import { createMockStudyBackend } from '@/mocks/study-backend';
import { readMockNickname } from '@/mocks/personal-settings-data';

const backend = createMockStudyBackend({
  storage: AsyncStorage,
  initialHome: mockHomeScenarios.dirty,
  async isOnline() {
    const network = await Network.getNetworkStateAsync();
    return network.isConnected === true && network.isInternetReachable === true;
  },
});
export const mockBackend = {
  ...backend,
  async getHome() { const home = await backend.getHome(); return { ...home, profile: { ...home.profile, nickname: await readMockNickname(AsyncStorage, home.profile.nickname) } }; },
  async getProfile() { const profile = await backend.getProfile(); return { ...profile, nickname: await readMockNickname(AsyncStorage, profile.nickname) }; },
};
