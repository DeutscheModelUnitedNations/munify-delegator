/**
 * Snapping in the layout editor, so elements line up exactly: an element being moved snaps its
 * edges and centre to those of the other elements on the page (and says where, so the editor
 * draws a guide), and otherwise to a grid. Resizing snaps the edges it moves, its right and
 * bottom one, to the others' edges, or its width and height to theirs, so fields come out the
 * same size. Everything is in fractions of the page, as placements are.
 */

/** An element's area on the page; a text is the point its baseline starts at, as wide as nothing. */
export type SnapRect = { x: number; y: number; width: number; height: number };

/** How far an edge may be from another's to snap to it, and the grid's step, per axis. */
export type SnapSteps = { threshold: { x: number; y: number }; grid: { x: number; y: number } };

/** Where the element lines up with another: the page positions to draw a guide at. */
export type SnapGuides = { vertical: number[]; horizontal: number[] };

type Axis = 'x' | 'y';
const size = { x: 'width', y: 'height' } as const;

/** The positions of an area's edges and centre along an axis: start, middle, end. */
const linesOf = ({ rect, axis }: { rect: SnapRect; axis: Axis }) => {
	const start = rect[axis];
	const length = rect[size[axis]];
	return [start, start + length / 2, start + length];
};

/** A shift that lines something up, and the page position to draw its guide at. */
type Candidate = { shift: number; at: number };

/** The candidate that moves least, within `threshold`. */
function nearest({ candidates, threshold }: { candidates: Candidate[]; threshold: number }) {
	let best: Candidate | undefined;
	for (const candidate of candidates) {
		if (Math.abs(candidate.shift) > threshold) continue;
		if (!best || Math.abs(candidate.shift) < Math.abs(best.shift)) best = candidate;
	}
	return best;
}

/**
 * How far to move along an axis to line up: a moved element's edges and centre with the others'
 * (`resize`: its far edge with their edges, or its size with theirs), within `threshold`; to the
 * grid otherwise. Answers the shift and, when it lined up, where.
 */
function snapAxis({
	rect,
	others,
	axis,
	threshold,
	grid,
	resize
}: {
	rect: SnapRect;
	others: readonly SnapRect[];
	axis: Axis;
	threshold: number;
	grid: number;
	resize: boolean;
}): { shift: number; at?: number } {
	const lines = linesOf({ rect, axis });
	const moving = resize ? [lines[2]] : lines;
	const targets = others.flatMap((other) => linesOf({ rect: other, axis }));
	const candidates = moving.flatMap((line) =>
		targets.map((target) => ({ shift: target - line, at: target }))
	);
	if (resize) {
		// as wide (or high) as another: the guide at the far edge it then has
		for (const other of others) {
			const length = other[size[axis]];
			if (length > 0)
				candidates.push({ shift: length - rect[size[axis]], at: rect[axis] + length });
		}
	}
	const best = nearest({ candidates, threshold });
	if (best) return best;
	if (grid <= 0) return { shift: 0 };
	return { shift: Math.round(moving[0] / grid) * grid - moving[0] };
}

/**
 * Where `rect` snaps to while it is moved (or, `resize`, resized from its bottom right corner):
 * the shift per axis to add to its position (or size), and the guides to draw.
 */
export function snapRect({
	rect,
	others,
	steps,
	resize
}: {
	rect: SnapRect;
	others: readonly SnapRect[];
	steps: SnapSteps;
	resize: boolean;
}): { dx: number; dy: number; guides: SnapGuides } {
	const [x, y] = (['x', 'y'] as const).map((axis) =>
		snapAxis({
			rect,
			others,
			axis,
			threshold: steps.threshold[axis],
			grid: steps.grid[axis],
			resize
		})
	);
	return {
		dx: x.shift,
		dy: y.shift,
		guides: {
			vertical: x.at === undefined ? [] : [x.at],
			horizontal: y.at === undefined ? [] : [y.at]
		}
	};
}
