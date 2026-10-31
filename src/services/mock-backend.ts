import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';

import { mockHomeScenarios } from '@/mocks/home';
import { createMockStudyBackend } from '@/mocks/study-backend';

export const mockBackend = createMockStudyBackend({
  storage: AsyncStorage,
  initialHome: mockHomeScenarios.dirty,
  async isOnline() {
    const network = await Network.getNetworkStateAsync();
    return network.isConnected === true && network.isInternetReachable === true;
  },
});
