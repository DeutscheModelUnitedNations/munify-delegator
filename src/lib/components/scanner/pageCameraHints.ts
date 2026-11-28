import { m } from '#lib/paraglide/messages';
import type { ViewCorner } from '#lib/paperScan/camera/aim';
import type { PageCameraHint } from './pageCamera.svelte';

const CORNERS: Record<ViewCorner, () => string> = {
	topLeft: m.paperAimCornerTopLeft,
	topRight: m.paperAimCornerTopRight,
	bottomRight: m.paperAimCornerBottomRight,
	bottomLeft: m.paperAimCornerBottomLeft
};

const HINTS: Record<Exclude<PageCameraHint['kind'], 'covered'>, () => string> = {
	findPage: m.paperAimFindPage,
	dark: m.paperAimDark,
	nextPage: m.paperAimNextPage,
	closer: m.paperAimCloser,
	farther: m.paperAimFarther,
	holdStill: m.paperAimHoldStill,
	ready: m.paperAimReading,
	reading: m.paperAimReading,
	noCode: m.paperAimNoCode
};

/** What the person aiming the camera at a page is told. */
export function describeHint(hint: PageCameraHint): string {
	if (hint.kind !== 'covered') return HINTS[hint.kind]();
	return hint.where ? m.paperAimCoveredAt({ corner: CORNERS[hint.where]() }) : m.paperAimCovered();
}

/** Whether the page lies as it should: the frame shows it. */
export const pageInPlace = (hint: PageCameraHint) =>
	hint.kind === 'holdStill' || hint.kind === 'ready' || hint.kind === 'reading';
