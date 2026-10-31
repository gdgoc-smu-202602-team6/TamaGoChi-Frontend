import { useSyncExternalStore } from 'react';
import { Appearance, type ColorSchemeName } from 'react-native';

function subscribe(onChange: () => void) {
  const subscription = Appearance.addChangeListener(onChange);
  return () => subscription.remove();
}

function getServerSnapshot(): ColorSchemeName {
  return 'light';
}

export function useColorScheme() {
  return useSyncExternalStore(subscribe, Appearance.getColorScheme, getServerSnapshot);
}
