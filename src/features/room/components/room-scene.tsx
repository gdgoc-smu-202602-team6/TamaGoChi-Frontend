import { Image } from 'expo-image';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { PixelIcon } from '@/components/ui/pixel-icon';
import { CharacterSprite } from '@/components/character-sprite';
import { itemSource } from '@/features/shop/assets/item-assets';
import type { Placement, PlacementTarget, RoomAppearance, RoomLayout } from '@/types/room';
import { availableTargets, dragOnFloor, effectivePlacement, placementToScene, targetLabels } from '@/utils/room-layout';
import { dragOnSurface, surfacePlacementToScene, surfacePolicy } from '@/utils/room-surfaces';
import type { PlacementPolicy } from '@/types/shop';
import { roomShell } from '../assets/room-shell';

type Interaction = { selected: PlacementTarget | null; disabled: boolean; onSelect: (target: PlacementTarget) => void; onMove: (point: Placement) => void; onCancel: (target: PlacementTarget, previous?: Placement) => void; onDragging: (dragging: boolean) => void };
type SceneProps = { appearance: RoomAppearance; bugs: number; label?: string; interaction?: Interaction };
// Width, height and feet/center line for the replaceable placeholder sprites.
const dimensions: Partial<Record<PlacementTarget, readonly [number, number, number]>> = { DESK: [112, 101.5, 99 / 116], BOOKSHELF: [100, 90.625, 99 / 116], PLANT: [64, 58, 99 / 116], RUG: [134, 121.438, 55 / 116], CHARACTER: [72, 90, 1] };

function RoomObject({ point, previous, size, wallHeight, policy, viewportWidth, children, interaction }: { point: Placement; previous?: Placement; size: number; wallHeight?: number; policy?: PlacementPolicy; viewportWidth: number; children: ReactNode; interaction?: Interaction }) {
  const start = useRef<{ point: Placement; previous?: Placement; pageX: number; pageY: number; moved: boolean } | null>(null);
  const wall = !!policy && policy.surfaceKind === 'WALL';
  const anchor = policy && wallHeight ? surfacePlacementToScene(point, policy, size, wallHeight) : placementToScene(point, size), scale = 3 / size;
  const [baseWidth, baseHeight, feet] = dimensions[point.target] ?? [72, 72, .5];
  const width = wall ? policy.width * 208 / size : baseWidth * scale, height = wall ? policy.height * 150 / wallHeight! : baseHeight * scale;
  const horizontalHit = Math.max(0, (44 - width * viewportWidth / 480) / 2), verticalHit = Math.max(0, (44 - height * viewportWidth / 480) / 2);
  const moveTo = (event: GestureResponderEvent) => {
    if (!start.current || interaction?.disabled || event.nativeEvent.touches.length > 1) return;
    const dx = event.nativeEvent.pageX - start.current.pageX, dy = event.nativeEvent.pageY - start.current.pageY;
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
    if (!start.current.moved && Math.hypot(dx, dy) < 1) return;
    start.current.moved = true;
    interaction?.onMove(policy && wallHeight ? dragOnSurface(start.current.point, policy, dx, dy, viewportWidth, size, wallHeight) : dragOnFloor(start.current.point, dx, dy, viewportWidth, size));
  };
  return <View testID={`room-object-${point.target}`} accessible={!!interaction} accessibilityRole={interaction ? 'button' : undefined}
    hitSlop={interaction ? { left: horizontalHit, right: horizontalHit, top: verticalHit, bottom: verticalHit } : undefined}
    onStartShouldSetResponder={() => !!interaction && !interaction.disabled}
    onResponderGrant={event => { start.current = { point, previous, pageX: event.nativeEvent.pageX, pageY: event.nativeEvent.pageY, moved: false }; interaction?.onSelect(point.target); interaction?.onDragging(true); }}
    onResponderMove={moveTo}
    // Touch move events can be coalesced; the release carries the final finger position.
    onResponderRelease={event => { moveTo(event); start.current = null; interaction?.onDragging(false); }}
    onResponderTerminate={() => { if (start.current) interaction?.onCancel(point.target, start.current.previous); start.current = null; interaction?.onDragging(false); }}
    onResponderTerminationRequest={() => false}
    accessibilityLabel={`배치 ${targetLabels[point.target]}`} accessibilityState={{ selected: interaction?.selected === point.target, disabled: interaction?.disabled }}
    accessibilityHint={interaction ? wall ? '터치한 채 벽을 따라 끌어서 옮겨요. 모서리를 지나 반대 벽으로 옮길 수 있어요.' : '터치한 채 끌어서 옮겨요.' : undefined}
    onAccessibilityTap={() => interaction?.onSelect(point.target)}
    style={[styles.object, { left: `${(anchor.x - width / 2) / 4.8}%`, top: `${(anchor.y - height * (wall ? .5 : feet)) / 4}%`, width: `${width / 4.8}%`, height: `${height / 4}%`, zIndex: wall ? 3 : point.target === 'RUG' ? 1 : 10 + Math.round(anchor.y) }, wall && { transform: [{ skewY: point.surface === 'LEFT_WALL' ? '-24.78deg' : '24.78deg' }] }]}>
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>{children}</View>
  </View>;
}
export function RoomScene({ appearance, bugs, label = '내 방', interaction }: SceneProps) {
  const [width, setWidth] = useState(0);
  const shell = useMemo(() => roomShell(appearance.items), [appearance.items]);
  const layout: RoomLayout = { equipped: appearance.items.map(item => ({ slot: item.slot, itemId: item.id })), placements: appearance.placements, ...(appearance.wallHeight !== undefined ? { wallHeight: appearance.wallHeight } : {}) };
  const targets = availableTargets(layout, appearance.items);
  const item = (slot: string) => appearance.items.find(item => item.slot === slot);
  return <View style={styles.scene} onLayout={event => setWidth(event.nativeEvent.layout.width)} accessible={!interaction} accessibilityRole={!interaction ? 'image' : undefined}
    accessibilityLabel={!interaction ? `${label}, ${appearance.size}칸 방, ${appearance.items.map(item => item.name).join(', ')}, 버그 ${bugs}마리` : undefined} testID="room-scene">
    <Image source={shell} style={StyleSheet.absoluteFill} contentFit="contain" accessible={false} />
    {(['WINDOW', 'CLOCK', 'LAMP'] as const).map(slot => item(slot) && !targets.includes(slot) && <Image key={slot} source={itemSource(item(slot)!, true)} contentFit="contain" accessible={false} style={[styles.fixed, slot === 'WINDOW' ? styles.window : slot === 'CLOCK' ? styles.clock : styles.lamp]} />)}
    {bugs > 0 && <><View style={styles.dustOne} /><View style={styles.dustTwo} /></>}
    {targets.map(target => <RoomObject key={target} point={effectivePlacement(layout, target, appearance.size, appearance.items)} previous={layout.placements.find(one => one.target === target)} size={appearance.size} wallHeight={appearance.wallHeight} policy={appearance.wallHeight ? surfacePolicy(layout, target, appearance.items) : undefined} viewportWidth={width} interaction={interaction}>
      {target === 'CHARACTER' ? <CharacterSprite accessories={appearance.items} /> : <Image source={itemSource(item(target)!, true, !!appearance.wallHeight && surfacePolicy(layout, target, appearance.items)?.surfaceKind === 'WALL')} contentFit={appearance.wallHeight && surfacePolicy(layout, target, appearance.items)?.surfaceKind === 'WALL' ? 'fill' : 'contain'} style={StyleSheet.absoluteFill} accessible={false} />}
    </RoomObject>)}
    {[{ left: '35%', top: '67%' }, { left: '73%', top: '72%' }, { left: '45%', top: '84%' }].slice(0, bugs).map((position, index) => <View key={index} pointerEvents="none" style={[styles.bug, { left: position.left as `${number}%`, top: position.top as `${number}%` }]}><PixelIcon name="bug" size={20} /></View>)}
  </View>;
}
const styles = StyleSheet.create({
  scene: { width: '100%', aspectRatio: 480 / 400, overflow: 'hidden' }, object: { position: 'absolute' },
  fixed: { position: 'absolute', zIndex: 2 }, window: { left: '15%', top: '24%', width: '20%', height: '25%' }, clock: { left: '62%', top: '14%', width: '12%', height: '21%' }, lamp: { left: '76%', top: '36%', width: '13%', height: '25%' },
  bug: { position: 'absolute', zIndex: 500 }, dustOne: { position: 'absolute', left: '32%', top: '64%', width: '12%', height: '4%', backgroundColor: '#A4A1B870', transform: [{ rotate: '-25deg' }] }, dustTwo: { position: 'absolute', left: '65%', top: '77%', width: '12%', height: '4%', backgroundColor: '#A4A1B870', transform: [{ rotate: '25deg' }] },
});
