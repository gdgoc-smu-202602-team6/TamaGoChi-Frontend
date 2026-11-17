import { Image, type ImageProps } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { PixelIcon } from '@/components/ui/pixel-icon';
import { characterSource } from '@/components/character-sprite';
import { deskPlaceholder, plantPlaceholder, roomPlaceholder } from '@/features/home/assets/room-placeholder';
import { RoomScene } from '@/features/room/components/room-scene';
import type { RoomAppearance } from '@/types/room';

type RoomAssets = Record<'room' | 'character' | 'plant' | 'desk', ImageProps['source']>;
type RoomPreviewProps = {
  bugs: number;
  name: string;
  characterLabel: string;
  assets?: Partial<RoomAssets>;
  appearance?: RoomAppearance;
};

const defaults: RoomAssets = {
  room: roomPlaceholder,
  character: characterSource,
  plant: plantPlaceholder,
  desk: deskPlaceholder,
};
const bugPositions = [{ left: '35%', top: '65%' }, { left: '70%', top: '72%' }, { left: '46%', top: '83%' }] as const;

export function RoomPreview({ bugs, name, characterLabel, assets, appearance }: RoomPreviewProps) {
  if (appearance) return <RoomScene appearance={appearance} bugs={bugs} label={`${name}, ${characterLabel}`} />;
  const sources = { ...defaults, ...assets };
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${name}, ${characterLabel}, ${bugs > 0 ? `버그 ${bugs}마리가 있는 방` : '깨끗한 방'}`}
      style={styles.scene}>
      <Image source={sources.room} contentFit="contain" style={StyleSheet.absoluteFill} />
      <Image source={sources.desk} contentFit="contain" style={styles.desk} />
      <Image source={sources.plant} contentFit="contain" style={styles.plant} />
      {bugs > 0 && <>
        <View style={styles.dustOne} />
        <View style={styles.dustTwo} />
      </>}
      <View style={styles.characterShadow} />
      <Image source={sources.character} contentFit="contain" style={styles.character} />
      {bugPositions.slice(0, bugs).map((position, index) => (
        <View key={index} style={[styles.bug, position]}><PixelIcon name="bug" size={22} /></View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Coordinates describe the placeholder artwork, not server room coordinates.
  scene: { width: '100%', aspectRatio: 480 / 400 },
  desk: { position: 'absolute', left: '62%', top: '37%', width: '25%', height: '33%' },
  plant: { position: 'absolute', left: '23%', top: '57%', width: '11%', height: '17%' },
  character: { position: 'absolute', left: '43%', top: '55%', width: '16%', height: '26%' },
  characterShadow: { position: 'absolute', left: '41%', top: '78%', width: '20%', height: '5%', borderRadius: 40, backgroundColor: '#9B96B280' },
  bug: { position: 'absolute' },
  dustOne: { position: 'absolute', left: '35%', top: '62%', width: '12%', height: '4%', backgroundColor: '#A4A1B870', transform: [{ rotate: '-25deg' }] },
  dustTwo: { position: 'absolute', left: '65%', top: '77%', width: '12%', height: '4%', backgroundColor: '#A4A1B870', transform: [{ rotate: '25deg' }] },
});
