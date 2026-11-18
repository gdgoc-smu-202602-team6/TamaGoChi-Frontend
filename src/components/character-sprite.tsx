import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { accessoryArt, itemArt, itemSource } from '@/features/shop/assets/item-assets';
import type { ShopItem } from '@/types/shop';

/** Default character (robot, 2-frame animation) for screens without room data. */
export const characterSource = require('@/assets/game/character.gif');
const robotPixels = [28, 39] as const;

type Slot = 'HEAD' | 'FACE' | 'NECK';
// Accessories are drawn 1:1 with the character pixels. These are their top-left corners in each
// character's crop: hat over the head, glasses on the eyes, scarf around the neck.
// The robot's spots also serve characters without their own (future codes).
const anchors: Record<string, Record<Slot, readonly [left: number, top: number]>> = {
  robot: { HEAD: [5, 1], FACE: [8, 14], NECK: [6, 24] },
  hamster: { HEAD: [5, -3], FACE: [8, 8], NECK: [1, 16] },
  fox: { HEAD: [4, -2], FACE: [7, 9], NECK: [3, 17] },
  frog: { HEAD: [4, -6], FACE: [7, 2], NECK: [0, 11] },
};
// Size for accessories without designer art: the robot art's size for that slot.
const fallbackPixels: Record<Slot, readonly [number, number]> = { HEAD: [18, 10], FACE: [12, 5], NECK: [16, 7] };

/** Source-pixel size of the equipped character, for sizing it next to other characters. */
export function characterPixels(items: readonly ShopItem[] = []): readonly [number, number] {
  const character = items.find(one => one.slot === 'CHARACTER');
  return (character && itemArt(character)?.pixels) || robotPixels;
}

// Room, profile and study share the character and its accessory spots.
// `items` is the equipped item list: the CHARACTER item picks the sprite, HEAD/FACE/NECK are drawn on it.
export function CharacterSprite({ items = [], label }: { items?: readonly ShopItem[]; label?: string }) {
  const character = items.find(one => one.slot === 'CHARACTER'), code = character?.code ?? 'robot';
  const [width, height] = characterPixels(items), spots = anchors[code] ?? anchors.robot;
  const percent = (value: number, of: number) => `${value / of * 100}%` as const;
  return <View style={styles.box} accessible={!!label} accessibilityRole={label ? 'image' : undefined} accessibilityLabel={label}>
    <View style={[styles.sprite, { aspectRatio: width / height }]}>
      <Image source={character ? itemSource(character, true) : characterSource} contentFit="contain" style={StyleSheet.absoluteFill} accessible={false} />
      {(['NECK', 'FACE', 'HEAD'] as const).map(slot => {
        const item = items.find(one => one.slot === slot);
        if (!item) return null;
        const art = accessoryArt(item, code), [w, h] = art?.pixels ?? fallbackPixels[slot], [left, top] = spots[slot];
        return <Image key={slot} testID={`character-accessory-${slot}`} source={art?.source ?? itemSource(item, true)} contentFit="contain" accessible={false}
          style={[styles.accessory, { left: percent(left, width), top: percent(top, height), width: percent(w, width), height: percent(h, height) }]} />;
      })}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  box: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  sprite: { height: '100%', maxWidth: '100%' },
  accessory: { position: 'absolute' },
});
