import { Image } from 'expo-image';
import { useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { PixelIcon } from '@/components/ui/pixel-icon';
import { CharacterSprite, characterPixels } from '@/components/character-sprite';
import { DesignerPixel, designerRoomFrame, RoomGeometry as G } from '@/constants/room-geometry';
import { itemArt, itemSource, type ItemArt } from '@/features/shop/assets/item-assets';
import type { Placement, PlacementTarget, RoomAppearance, RoomLayout } from '@/types/room';
import { availableTargets, dragOnFloor, effectivePlacement, floorToScene, placementToScene, targetLabels } from '@/utils/room-layout';
import { dragOnSurface, surfacePlacementToScene, surfacePolicy } from '@/utils/room-surfaces';
import type { PlacementPolicy } from '@/types/shop';
import { roomShell, wallpaperOverlay } from '../assets/room-shell';

type Interaction = { selected: PlacementTarget | null; disabled: boolean; onSelect: (target: PlacementTarget) => void; onMove: (point: Placement) => void; onCancel: (target: PlacementTarget, previous?: Placement) => void; onDragging: (dragging: boolean) => void };
type SceneProps = { appearance: RoomAppearance; bugs: number; label?: string; interaction?: Interaction };

// Scene units → percentage of the scene box.
const px = (value: number) => `${value / (G.width / 100)}%` as const, py = (value: number) => `${value / (G.height / 100)}%` as const;
// Placeholder sprite sizes were drawn for a 208-unit half floor; keep their size relative to the floor.
const k = G.halfWidth / 208;
// Width, height and feet line (fraction of height) at room size 3.
type Dimensions = readonly [width: number, height: number, feet: number];
const dimensions: Partial<Record<PlacementTarget, Dimensions>> = { DESK: [112 * k, 101.5 * k, 99 / 116], BOOKSHELF: [100 * k, 90.625 * k, 99 / 116], PLANT: [64 * k, 58 * k, 99 / 116], RUG: [134 * k, 121.438 * k, 55 / 116] };
// Characters are drawn larger than the room's pixel scale so they read on a phone: the robot is 88 units tall.
const characterScale = 88 / 39;
const wallSkew = `${Math.atan(G.halfDepth / G.halfWidth) * 180 / Math.PI}deg`;

function RoomObject({ point, previous, size, wallHeight, wallScene, policy, art, base, viewportWidth, children, interaction }: { point: Placement; previous?: Placement; size: number; wallHeight?: number; wallScene: number; policy?: PlacementPolicy; art?: ItemArt; base?: Dimensions; viewportWidth: number; children: ReactNode; interaction?: Interaction }) {
  const start = useRef<{ point: Placement; previous?: Placement; pageX: number; pageY: number; moved: boolean } | null>(null);
  const wall = !!policy && policy.surfaceKind === 'WALL';
  const anchor = policy && wallHeight ? surfacePlacementToScene(point, policy, size, wallHeight, wallScene) : placementToScene(point, size), scale = 3 / size;
  const [baseWidth, baseHeight, baseFeet] = base ?? [72 * k, 72 * k, .5];
  // Designer art keeps its drawn size relative to the designer room; placeholders follow the catalog footprint.
  const width = art ? art.pixels[0] * DesignerPixel * scale : wall ? policy.width * G.halfWidth / size : baseWidth * scale;
  const height = art ? art.pixels[1] * DesignerPixel * scale : wall ? policy.height * wallScene / wallHeight! : baseHeight * scale;
  // Standing art rests on its footprint; a rug lies flat, so its middle sits on the footprint centre.
  const feet = wall ? .5 : art ? point.target === 'RUG' ? .5 : 1 : baseFeet;
  const horizontalHit = Math.max(0, (44 - width * viewportWidth / G.width) / 2), verticalHit = Math.max(0, (44 - height * viewportWidth / G.width) / 2);
  const moveTo = (event: GestureResponderEvent) => {
    if (!start.current || interaction?.disabled || event.nativeEvent.touches.length > 1) return;
    const dx = event.nativeEvent.pageX - start.current.pageX, dy = event.nativeEvent.pageY - start.current.pageY;
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
    if (!start.current.moved && Math.hypot(dx, dy) < 1) return;
    start.current.moved = true;
    interaction?.onMove(policy && wallHeight ? dragOnSurface(start.current.point, policy, dx, dy, viewportWidth, size, wallHeight, wallScene) : dragOnFloor(start.current.point, dx, dy, viewportWidth, size));
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
    style={[styles.object, { left: px(anchor.x - width / 2), top: py(anchor.y - height * feet), width: px(width), height: py(height), zIndex: wall ? 3 : point.target === 'RUG' ? 1 : 10 + Math.round(anchor.y) },
      wall && !art && { transform: [{ skewY: point.surface === 'LEFT_WALL' ? `-${wallSkew}` : wallSkew }] },
      // Mirror perspective art when it hangs on the other wall.
      wall && art?.wall && art.wall !== point.surface && styles.mirrored]}>
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>{children}</View>
  </View>;
}

// Floor spots for bugs, as fractions of the floor, so they stay on any room size.
const floorSpot = (fx: number, fy: number) => floorToScene(fx, fy, 1);
const bugSpots = [floorSpot(.25, .85), floorSpot(.85, .45), floorSpot(.7, .95)];

export function RoomScene({ appearance, bugs, label = '내 방', interaction }: SceneProps) {
  const [width, setWidth] = useState(0);
  const room = appearance.items.find(item => item.slot === 'ROOM'), roomArt = room ? itemArt(room)?.room : undefined, roomSource = room && roomArt ? itemArt(room)!.source : undefined;
  // Designer rooms are scaled so their floor matches the scene floor; their walls keep the drawn height.
  const frame = roomArt ? designerRoomFrame(roomArt) : undefined, wallScene = frame?.wallHeight ?? G.wallHeight;
  // React Compiler memoizes this SVG build.
  const shell = roomArt ? wallpaperOverlay(appearance.items, wallScene) : roomShell(appearance.items);
  const [characterWidth, characterHeight] = characterPixels(appearance.items);
  const layout: RoomLayout = { equipped: appearance.items.map(item => ({ slot: item.slot, itemId: item.id })), placements: appearance.placements, ...(appearance.wallHeight !== undefined ? { wallHeight: appearance.wallHeight } : {}) };
  const targets = availableTargets(layout, appearance.items);
  const item = (slot: string) => appearance.items.find(item => item.slot === slot);
  // 20px on the full-width home room (about 354px wide), proportionally smaller in thumbnails.
  const bugSize = width ? Math.max(8, Math.min(22, Math.round(width * 0.056))) : 20;
  return <View style={styles.scene} onLayout={event => setWidth(event.nativeEvent.layout.width)} accessible={!interaction} accessibilityRole={!interaction ? 'image' : undefined}
    accessibilityLabel={!interaction ? `${label}, ${appearance.size}칸 방, ${appearance.items.map(item => item.name).join(', ')}, 버그 ${bugs}마리` : undefined} testID="room-scene">
    {frame && <Image source={roomSource} contentFit="fill" accessible={false} style={[styles.designerRoom, { left: px(frame.left), top: py(frame.top), width: px(frame.width), height: py(frame.height) }]} />}
    {shell && <Image source={shell} style={StyleSheet.absoluteFill} contentFit="contain" accessible={false} />}
    {(['WINDOW', 'CLOCK', 'LAMP'] as const).map(slot => item(slot) && !targets.includes(slot) && <Image key={slot} source={itemSource(item(slot)!, true)} contentFit="contain" accessible={false} style={[styles.fixed, slot === 'WINDOW' ? styles.window : slot === 'CLOCK' ? styles.clock : styles.lamp]} />)}
    {targets.map(target => {
      const policy = appearance.wallHeight ? surfacePolicy(layout, target, appearance.items) : undefined, onWall = policy?.surfaceKind === 'WALL', thing = target === 'CHARACTER' ? undefined : item(target)!;
      const art = thing ? itemArt(thing) : undefined;
      return <RoomObject key={target} point={effectivePlacement(layout, target, appearance.size, appearance.items)} previous={layout.placements.find(one => one.target === target)} size={appearance.size} wallHeight={appearance.wallHeight} wallScene={wallScene} policy={policy} art={art} viewportWidth={width} interaction={interaction}
        base={target === 'CHARACTER' ? [characterWidth * characterScale, characterHeight * characterScale, 1] : dimensions[target]}>
        {thing ? <Image source={itemSource(thing, true, onWall)} contentFit={onWall && !art ? 'fill' : 'contain'} style={StyleSheet.absoluteFill} accessible={false} /> : <CharacterSprite items={appearance.items} />}
      </RoomObject>;
    })}
    {bugSpots.slice(0, bugs).map((spot, index) => <View key={index} pointerEvents="none" style={[styles.bug, { left: px(spot.x), top: py(spot.y), marginLeft: -bugSize / 2, marginTop: -bugSize / 2 }]}><PixelIcon name="bug" size={bugSize} /></View>)}
  </View>;
}
const styles = StyleSheet.create({
  scene: { width: '100%', aspectRatio: G.width / G.height, overflow: 'hidden' }, object: { position: 'absolute' }, mirrored: { transform: [{ scaleX: -1 }] },
  designerRoom: { position: 'absolute' },
  // Legacy rooms without wall placement keep fixed spots for the window, clock and lamp.
  fixed: { position: 'absolute', zIndex: 2 }, window: { left: '21.8%', top: '21.5%', width: '20%', height: '25%' }, clock: { left: '65.8%', top: '25.6%', width: '12.1%', height: '13.3%' }, lamp: { left: '69.1%', top: '45.8%', width: '12.9%', height: '25%' },
  bug: { position: 'absolute', zIndex: 500 },
});
