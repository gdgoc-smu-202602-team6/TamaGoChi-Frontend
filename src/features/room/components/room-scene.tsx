import { Image } from 'expo-image';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { PixelIcon } from '@/components/ui/pixel-icon';
import { GameColors } from '@/constants/theme';
import { characterPlaceholder } from '@/features/home/assets/room-placeholder';
import { itemSource } from '@/features/shop/assets/item-assets';
import type { Placement, PlacementTarget, RoomAppearance, RoomLayout } from '@/types/room';
import { availableTargets, dragOnFloor, effectivePlacement, placementToScene, targetLabels } from '@/utils/room-layout';
import { roomShell } from '../assets/room-shell';

type Interaction = { selected: PlacementTarget | null; disabled: boolean; onSelect: (target: PlacementTarget) => void; onMove: (point: Placement) => void; onDragging: (dragging: boolean) => void };
type SceneProps = { appearance: RoomAppearance; bugs: number; label?: string; interaction?: Interaction };
// Width, height and feet/center line for the replaceable placeholder sprites.
const dimensions: Record<PlacementTarget, readonly [number, number, number]> = { DESK: [112, 101.5, 99 / 116], BOOKSHELF: [100, 90.625, 99 / 116], PLANT: [64, 58, 99 / 116], RUG: [134, 121.438, 55 / 116], CHARACTER: [72, 90, 1] };

function FloorObject({ point, size, viewportWidth, children, interaction }: { point: Placement; size: number; viewportWidth: number; children: ReactNode; interaction?: Interaction }) {
  const start = useRef<{ point: Placement; pageX: number; pageY: number } | null>(null);
  const anchor = placementToScene(point, size), scale = 3 / size;
  const [baseWidth, baseHeight, feet] = dimensions[point.target], width = baseWidth * scale, height = baseHeight * scale;
  return <View testID={`room-object-${point.target}`} accessible={!!interaction} accessibilityRole={interaction ? 'button' : undefined}
    onStartShouldSetResponder={() => !!interaction && !interaction.disabled}
    onResponderGrant={event => { start.current = { point, pageX: event.nativeEvent.pageX, pageY: event.nativeEvent.pageY }; interaction?.onSelect(point.target); interaction?.onDragging(true); }}
    onResponderMove={event => { if (start.current && !interaction?.disabled && event.nativeEvent.touches.length <= 1) interaction?.onMove(dragOnFloor(start.current.point, event.nativeEvent.pageX - start.current.pageX, event.nativeEvent.pageY - start.current.pageY, viewportWidth, size)); }}
    onResponderRelease={() => { start.current = null; interaction?.onDragging(false); }}
    onResponderTerminate={() => { if (start.current) interaction?.onMove(start.current.point); start.current = null; interaction?.onDragging(false); }}
    onResponderTerminationRequest={() => false}
    accessibilityLabel={`배치 ${targetLabels[point.target]}`} accessibilityState={{ selected: interaction?.selected === point.target, disabled: interaction?.disabled }}
    onAccessibilityTap={() => interaction?.onSelect(point.target)}
    style={[styles.object, { left: `${(anchor.x - width / 2) / 4.8}%`, top: `${(anchor.y - height * feet) / 4}%`, width: `${width / 4.8}%`, height: `${height / 4}%`, zIndex: point.target === 'RUG' ? 1 : 10 + Math.round(anchor.y) }, interaction?.selected === point.target && styles.selected]}>
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>{children}</View>
  </View>;
}
export function RoomScene({ appearance, bugs, label = '내 방', interaction }: SceneProps) {
  const [width, setWidth] = useState(0);
  const shell = useMemo(() => roomShell(appearance.items), [appearance.items]);
  const layout: RoomLayout = { equipped: appearance.items.map(item => ({ slot: item.slot, itemId: item.id })), placements: appearance.placements };
  const item = (slot: string) => appearance.items.find(item => item.slot === slot);
  return <View style={styles.scene} onLayout={event => setWidth(event.nativeEvent.layout.width)} accessible={!interaction} accessibilityRole={!interaction ? 'image' : undefined}
    accessibilityLabel={!interaction ? `${label}, ${appearance.size}칸 방, ${appearance.items.map(item => item.name).join(', ')}, 버그 ${bugs}마리` : undefined} testID="room-scene">
    <Image source={shell} style={StyleSheet.absoluteFill} contentFit="contain" accessible={false} />
    {(['WINDOW', 'CLOCK', 'LAMP'] as const).map(slot => item(slot) && <Image key={slot} source={itemSource(item(slot)!)} contentFit="contain" accessible={false} style={[styles.fixed, slot === 'WINDOW' ? styles.window : slot === 'CLOCK' ? styles.clock : styles.lamp]} />)}
    {bugs > 0 && <><View style={styles.dustOne} /><View style={styles.dustTwo} /></>}
    {availableTargets(layout).map(target => <FloorObject key={target} point={effectivePlacement(layout, target, appearance.size)} size={appearance.size} viewportWidth={width} interaction={interaction}>
      {target === 'CHARACTER' ? <>
        <Image source={characterPlaceholder} contentFit="contain" style={StyleSheet.absoluteFill} accessible={false} />
        {(['HEAD', 'FACE', 'NECK'] as const).map(slot => item(slot) && <Image key={slot} source={itemSource(item(slot)!)} contentFit="contain" style={[styles.accessory, slot === 'HEAD' ? styles.head : slot === 'FACE' ? styles.face : styles.neck]} accessible={false} />)}
      </> : <Image source={itemSource(item(target)!, true)} contentFit="contain" style={StyleSheet.absoluteFill} accessible={false} />}
    </FloorObject>)}
    {[{ left: '35%', top: '67%' }, { left: '73%', top: '72%' }, { left: '45%', top: '84%' }].slice(0, bugs).map((position, index) => <View key={index} pointerEvents="none" style={[styles.bug, { left: position.left as `${number}%`, top: position.top as `${number}%` }]}><PixelIcon name="bug" size={20} /></View>)}
  </View>;
}
const styles = StyleSheet.create({
  scene: { width: '100%', aspectRatio: 480 / 400, overflow: 'hidden' }, object: { position: 'absolute' },
  selected: { outlineColor: GameColors.heart, outlineWidth: 3, outlineStyle: 'dashed', borderWidth: 2, borderColor: GameColors.heart, borderStyle: 'dashed' },
  fixed: { position: 'absolute', zIndex: 2 }, window: { left: '15%', top: '24%', width: '20%', height: '25%' }, clock: { left: '62%', top: '14%', width: '12%', height: '21%' }, lamp: { left: '76%', top: '36%', width: '13%', height: '25%' },
  accessory: { position: 'absolute' }, head: { top: '-13%', left: '0%', width: '100%', height: '52%' }, face: { top: '18%', left: '7%', width: '86%', height: '34%' }, neck: { top: '42%', left: '0%', width: '100%', height: '38%' },
  bug: { position: 'absolute', zIndex: 500 }, dustOne: { position: 'absolute', left: '32%', top: '64%', width: '12%', height: '4%', backgroundColor: '#A4A1B870', transform: [{ rotate: '-25deg' }] }, dustTwo: { position: 'absolute', left: '65%', top: '77%', width: '12%', height: '4%', backgroundColor: '#A4A1B870', transform: [{ rotate: '25deg' }] },
});
