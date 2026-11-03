import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/state/auth-context';
import { GameServicesProvider } from '@/state/game-services';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <AnimatedSplashOverlay />
        <GameServicesProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="study" />
            <Stack.Screen name="study-result/[sessionId]" />
            <Stack.Screen name="login" />
            <Stack.Screen name="signup" />
            <Stack.Screen name="verify-email" />
            <Stack.Screen name="forgot-password" />
            <Stack.Screen name="reset-password" />
            <Stack.Screen name="account" />
            <Stack.Screen name="clubs/join" />
            <Stack.Screen name="clubs/create" />
            <Stack.Screen name="room-edit" />
            <Stack.Screen name="clubs/[clubId]/applications" />
            <Stack.Screen name="clubs/[clubId]/notices/compose" />
            <Stack.Screen name="clubs/[clubId]/notices/[noticeId]/edit" />
            <Stack.Screen name="clubs/[clubId]/notice-categories" />
        <Stack.Screen name="clubs/[clubId]/settings" />
        <Stack.Screen name="clubs/[clubId]/parts" />
          </Stack>
        </GameServicesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
