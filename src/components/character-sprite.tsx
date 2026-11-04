import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { characterPlaceholder } from '@/features/home/assets/room-placeholder';
import { itemSource } from '@/features/shop/assets/item-assets';
import type { ShopItem } from '@/types/shop';

// Room and profile share replacement assets and the same accessory anchors.
export function CharacterSprite({ accessories = [], label }: { accessories?: readonly ShopItem[]; label?: string }) {
  return <View style={styles.sprite} accessible={!!label} accessibilityRole={label ? 'image' : undefined} accessibilityLabel={label}>
    <Image source={characterPlaceholder} contentFit="contain" style={StyleSheet.absoluteFill} accessible={false} />
    {(['HEAD', 'FACE', 'NECK'] as const).map(slot => { const item = accessories.find(one => one.slot === slot); return item && <Image key={slot} testID={`character-accessory-${slot}`} source={itemSource(item, true)} contentFit="contain" style={[styles.accessory, slot === 'HEAD' ? styles.head : slot === 'FACE' ? styles.face : styles.neck]} accessible={false} />; })}
  </View>;
}
const styles = StyleSheet.create({ sprite: { width: '100%', height: '100%' }, accessory: { position: 'absolute' }, head: { top: '-13%', left: '0%', width: '100%', height: '52%' }, face: { top: '18%', left: '7%', width: '86%', height: '34%' }, neck: { top: '42%', left: '0%', width: '100%', height: '38%' } });
