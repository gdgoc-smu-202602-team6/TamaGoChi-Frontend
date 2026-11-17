import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { itemArt, itemSource } from '@/features/shop/assets/item-assets';
import type { ShopItem } from '@/types/shop';

/** Default character (robot, 2-frame animation) for screens without room data. */
export const characterSource = require('@/assets/game/character.gif');
const robotPixels = [28, 39] as const;

type Box = readonly [left: number, top: number, width: number, height: number];
// Accessory boxes in source pixels of each character crop: hat above the head, glasses on the eyes, scarf at the neck.
// The robot's boxes also serve characters without their own (future codes).
const anchors: Record<string, Record<'HEAD' | 'FACE' | 'NECK', Box>> = {
  robot: { HEAD: [3, .4, 22, 12.5], FACE: [5, 13.8, 18, 7.5], NECK: [3, 24.5, 22, 9.6] },
  hamster: { HEAD: [3, -3, 22, 11], FACE: [5, 8, 18, 6], NECK: [3, 17, 22, 8] },
  fox: { HEAD: [3, -2, 21, 10.5], FACE: [4, 8.5, 19, 6], NECK: [3, 18, 21, 8] },
  frog: { HEAD: [3, -6, 20, 10], FACE: [3, 2, 20, 6.5], NECK: [2, 12.5, 22, 8] },
};

/** Source-pixel size of the equipped character, for sizing it next to other characters. */
export function characterPixels(items: readonly ShopItem[] = []): readonly [number, number] {
  const character = items.find(one => one.slot === 'CHARACTER');
  return (character && itemArt(character)?.pixels) || robotPixels;
}

// Room, profile and study share the character and its accessory anchors.
// `items` is the equipped item list: the CHARACTER item picks the sprite, HEAD/FACE/NECK are drawn on it.
export function CharacterSprite({ items = [], label }: { items?: readonly ShopItem[]; label?: string }) {
  const character = items.find(one => one.slot === 'CHARACTER');
  const [width, height] = characterPixels(items), boxes = anchors[character?.code ?? 'robot'] ?? anchors.robot;
  const percent = (value: number, of: number) => `${value / of * 100}%` as const;
  return <View style={styles.box} accessible={!!label} accessibilityRole={label ? 'image' : undefined} accessibilityLabel={label}>
    <View style={[styles.sprite, { aspectRatio: width / height }]}>
      <Image source={character ? itemSource(character, true) : characterSource} contentFit="contain" style={StyleSheet.absoluteFill} accessible={false} />
      {(['HEAD', 'FACE', 'NECK'] as const).map(slot => {
        const item = items.find(one => one.slot === slot), [left, top, w, h] = boxes[slot];
        return item && <Image key={slot} testID={`character-accessory-${slot}`} source={itemSource(item, true)} contentFit="contain" accessible={false}
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
