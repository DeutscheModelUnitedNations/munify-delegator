// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from 'pdf-lib';
import { beforeAll, describe, expect, test } from 'vitest';
import { defaultLayout } from '#lib/helpers/documentLayout';
import { drawPaperPage } from '../drawPaper';
import { renderPdfPage, simulatePhoto, type Pixels } from '../scanSimulation';
import {
	aimAt,
	missingMark,
	pageTaken,
	startAim,
	trackAim,
	tryAgain,
	type Aim,
	type AimMark
} from './aim';

/** The contract's first page as printed, with its marks. */
async function printedPage() {
	const template = readFileSync(
		fileURLToPath(new URL('../../../api/db/seed-data/templates/contract.pdf', import.meta.url))
	);
	const source = await PDFDocument.load(template);
	const pdf = await PDFDocument.create();
	const [copy] = await pdf.copyPages(source, [0]);
	pdf.addPage(copy);
	drawPaperPage({
		page: copy,
		document: 'contract',
		layout: defaultLayout('contract'),
		pageIndex: 0
	});
	return renderPdfPage({ bytes: await pdf.save(), dpi: 110 });
}

/** `picture` darker, as in a dim room. */
const dimmed = (picture: Pixels): Pixels => ({
	...picture,
	data: picture.data.map((value, index) => (index % 4 === 3 ? value : value * 0.2))
});

describe('aimAt', () => {
	let page: Pixels;
	beforeAll(async () => {
		page = await printedPage();
	}, 30_000);

	test('finds the four marks of a page held in view, where they are', () => {
		const aim = aimAt(simulatePhoto({ picture: page, tilt: 0.03, shadow: 0.4, noise: 15 }));
		expect(aim.marks.map(({ corner }) => corner)).toEqual([0, 1, 2, 3]);
		expect(aim.dark).toBe(false);
		const [topLeft, , bottomRight] = aim.marks;
		expect(topLeft.at.x).toBeLessThan(0.2);
		expect(topLeft.at.y).toBeLessThan(0.2);
		expect(bottomRight.at.x).toBeGreaterThan(0.8);
		expect(bottomRight.at.y).toBeGreaterThan(0.8);
	});

	test('tells which corner a thumb covers', () => {
		const aim = aimAt(simulatePhoto({ picture: page, tilt: 0.03, noise: 15, covered: [2] }));
		expect(aim.marks.map(({ corner }) => corner)).toEqual([0, 1, 3]);
		const hint = trackAim({ track: startAim(), aim, at: 0 }).hint;
		expect(hint).toEqual({ kind: 'covered', where: 'bottomRight' });
	});

	test('tells a dark picture', () => {
		const aim = aimAt(dimmed(simulatePhoto({ picture: page, noise: 4 })));
		expect(aim.dark).toBe(true);
	});

	test('is quick enough to aim by many times a second', () => {
		const photo = simulatePhoto({ picture: page, tilt: 0.03, shadow: 0.4, noise: 15 });
		aimAt(photo);
		const started = performance.now();
		for (let round = 0; round < 3; round++) aimAt(photo);
		// a phone takes several times as long; this keeps the aiming from growing slow unnoticed
		expect((performance.now() - started) / 3).toBeLessThan(250);
	});
});

/** An aim at a 1000 × 1000 picture with marks at these corners and places. */
const aimWith = (marks: [number, number, number][], dark = false): Aim => ({
	width: 1000,
	height: 1000,
	dark,
	marks: marks.map(([corner, x, y]): AimMark => ({ corner, at: { x, y } }))
});

const whole = (shift = 0) =>
	aimWith([
		[0, 0.1 + shift, 0.1],
		[1, 0.9 + shift, 0.1],
		[2, 0.9 + shift, 0.9],
		[3, 0.1 + shift, 0.9]
	]);

describe('trackAim', () => {
	test('takes the photo once the page lay still a moment', () => {
		const first = trackAim({ track: startAim(), aim: whole(), at: 0 });
		expect(first.hint).toEqual({ kind: 'holdStill' });
		const soon = trackAim({ track: first.track, aim: whole(0.002), at: 200 });
		expect(soon.hint).toEqual({ kind: 'holdStill' });
		expect(trackAim({ track: soon.track, aim: whole(0.004), at: 400 }).hint).toEqual({
			kind: 'ready'
		});
	});

	test('waits while the page moves', () => {
		const first = trackAim({ track: startAim(), aim: whole(), at: 0 });
		const moved = trackAim({ track: first.track, aim: whole(0.05), at: 400 });
		expect(moved.hint).toEqual({ kind: 'holdStill' });
		expect(trackAim({ track: moved.track, aim: whole(0.05), at: 600 }).hint).toEqual({
			kind: 'holdStill'
		});
	});

	test('asks for a page, or for light, while there is none in view', () => {
		expect(trackAim({ track: startAim(), aim: aimWith([]), at: 0 }).hint).toEqual({
			kind: 'findPage'
		});
		expect(trackAim({ track: startAim(), aim: aimWith([], true), at: 0 }).hint).toEqual({
			kind: 'dark'
		});
	});

	test('asks to come closer to a page far away', () => {
		const far = aimWith([
			[0, 0.4, 0.4],
			[1, 0.6, 0.4],
			[2, 0.6, 0.6],
			[3, 0.4, 0.6]
		]);
		const first = trackAim({ track: startAim(), aim: far, at: 0 });
		expect(first.hint).toEqual({ kind: 'closer' });
		expect(trackAim({ track: first.track, aim: far, at: 2000 }).hint).toEqual({ kind: 'closer' });
	});

	test('asks to step back when a corner lies outside the picture', () => {
		// held off to the right: the bottom right corner lies past the picture's edge
		const cut = aimWith([
			[0, 0.2, 0.1],
			[1, 0.98, 0.1],
			[3, 0.25, 0.9]
		]);
		expect(missingMark(cut)?.at.x).toBeGreaterThan(1);
		expect(trackAim({ track: startAim(), aim: cut, at: 0 }).hint).toEqual({ kind: 'farther' });
	});

	test('takes a page with one corner covered only after longer', () => {
		const covered = aimWith([
			[0, 0.1, 0.1],
			[1, 0.9, 0.1],
			[3, 0.1, 0.9]
		]);
		let step = trackAim({ track: startAim(), aim: covered, at: 0 });
		step = trackAim({ track: step.track, aim: covered, at: 500 });
		expect(step.hint).toEqual({ kind: 'covered', where: 'bottomRight' });
		expect(trackAim({ track: step.track, aim: covered, at: 1300 }).hint).toEqual({ kind: 'ready' });
	});

	test('never takes a page with two corners missing', () => {
		const half = aimWith([
			[0, 0.1, 0.1],
			[1, 0.9, 0.1]
		]);
		let step = trackAim({ track: startAim(), aim: half, at: 0 });
		step = trackAim({ track: step.track, aim: half, at: 5000 });
		expect(step.hint).toEqual({ kind: 'covered' });
	});

	test('waits for the next page once one was taken, until the page leaves the picture', () => {
		const first = trackAim({ track: startAim(), aim: whole(), at: 0 });
		const taken = pageTaken(trackAim({ track: first.track, aim: whole(), at: 400 }).track);
		const still = trackAim({ track: taken, aim: whole(), at: 2000 });
		expect(still.hint).toEqual({ kind: 'nextPage' });
		const gone = trackAim({ track: still.track, aim: aimWith([]), at: 2200 });
		expect(trackAim({ track: gone.track, aim: whole(), at: 2400 }).hint).toEqual({
			kind: 'holdStill'
		});
	});

	test('takes the next page slid under the camera, though no page left the picture', () => {
		const first = trackAim({ track: startAim(), aim: whole(), at: 0 });
		const taken = pageTaken(trackAim({ track: first.track, aim: whole(), at: 400 }).track);
		const nudged = trackAim({ track: taken, aim: whole(0.01), at: 600 });
		expect(nudged.hint).toEqual({ kind: 'nextPage' });
		const slid = trackAim({ track: nudged.track, aim: whole(0.08), at: 800 });
		expect(slid.hint).toEqual({ kind: 'holdStill' });
		const still = trackAim({ track: slid.track, aim: whole(0.08), at: 1000 });
		expect(trackAim({ track: still.track, aim: whole(0.08), at: 1200 }).hint).toEqual({
			kind: 'ready'
		});
	});

	test('takes no flicker of one mark for a page slid away', () => {
		const first = trackAim({ track: startAim(), aim: whole(), at: 0 });
		const taken = pageTaken(trackAim({ track: first.track, aim: whole(), at: 400 }).track);
		const flicker = aimWith([
			[0, 0.1, 0.1],
			[1, 0.9, 0.1],
			[2, 0.9, 0.9]
		]);
		expect(trackAim({ track: taken, aim: flicker, at: 600 }).hint).toEqual({ kind: 'nextPage' });
	});

	test('takes another photo after the page lay still again', () => {
		const first = trackAim({ track: startAim(), aim: whole(), at: 0 });
		const ready = trackAim({ track: first.track, aim: whole(), at: 400 });
		const again = trackAim({ track: tryAgain(ready.track), aim: whole(), at: 500 });
		expect(again.hint).toEqual({ kind: 'holdStill' });
		expect(trackAim({ track: again.track, aim: whole(), at: 850 }).hint).toEqual({ kind: 'ready' });
	});
});
