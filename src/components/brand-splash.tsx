import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GameColors } from '@/constants/theme';
import { characterSource } from '@/components/character-sprite';

// The app name appears only here, for about 1.5 seconds after launch.
export function BrandSplash({ onReady }: { onReady?: () => Promise<unknown> }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    let active = true, timer: ReturnType<typeof setTimeout> | undefined;
    void Promise.resolve().then(() => onReady?.()).catch(() => undefined).then(() => {
      if (active) timer = setTimeout(() => setVisible(false), 1500);
    });
    return () => { active = false; clearTimeout(timer); };
  }, [onReady]);
  if (!visible) return null;
  return <View style={styles.overlay} accessible accessibilityLabel="다마GoC치 시작 화면">
    <Image source={characterSource} contentFit="contain" accessible={false} style={styles.character} />
    <Text style={styles.name}>다마GoC치</Text>
  </View>;
}
const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, elevation: 100, backgroundColor: GameColors.sky, alignItems: 'center', justifyContent: 'center', gap: 18 },
  character: { width: 104, height: 145 },
  name: { fontSize: 40, lineHeight: 50, letterSpacing: -1, fontWeight: '900', color: GameColors.yellow, textShadowColor: GameColors.ink, textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0 },
});
