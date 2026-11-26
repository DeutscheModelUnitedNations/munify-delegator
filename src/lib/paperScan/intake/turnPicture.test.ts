// @vitest-environment node
import { crc32 } from 'node:zlib';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { describe, expect, test } from 'vitest';
import { turnJpeg, turnPng } from './turnPicture';

/** A picture twice as wide as high, its top left quarter black. */
function canvas() {
	const drawn = createCanvas(64, 32);
	const context = drawn.getContext('2d');
	context.fillStyle = 'white';
	context.fillRect(0, 0, 64, 32);
	context.fillStyle = 'black';
	context.fillRect(0, 0, 32, 16);
	return drawn;
}
const jpeg = () => new Uint8Array(canvas().toBuffer('image/jpeg', 95));
const png = () => new Uint8Array(canvas().toBuffer('image/png'));

/** The corner the black of `canvas` is in as the file is shown, and how it lies. */
async function shown(bytes: Uint8Array) {
	const image = await loadImage(Buffer.from(bytes));
	const drawn = createCanvas(image.width, image.height);
	const context = drawn.getContext('2d');
	context.drawImage(image, 0, 0);
	const blackAt = (x: number, y: number) =>
		context.getImageData(x * image.width, y * image.height, 1, 1).data[0] < 128;
	const corners = {
		topLeft: [0.2, 0.2],
		topRight: [0.8, 0.2],
		bottomRight: [0.8, 0.8],
		bottomLeft: [0.2, 0.8]
	};
	const black = Object.entries(corners).filter(([, [x, y]]) => blackAt(x, y));
	return { wide: image.width > image.height, black: black.map(([corner]) => corner) };
}

const TURNED = [
	{ turn: 1, wide: false, black: ['topRight'] },
	{ turn: 2, wide: true, black: ['bottomRight'] },
	{ turn: 3, wide: false, black: ['bottomLeft'] }
];

/** An Exif segment with one entry, little endian as phones write it. */
const exifSegment = ({ tag, value }: { tag: number; value: number }) =>
	// prettier-ignore
	new Uint8Array([
		0xff, 0xe1, 0, 34, ...new TextEncoder().encode('Exif\0\0'),
		0x49, 0x49, 42, 0, 8, 0, 0, 0,
		1, 0, tag & 0xff, tag >> 8, 3, 0, 1, 0, 0, 0, value, 0, 0, 0,
		0, 0, 0, 0
	]);
const withSegment = (bytes: Uint8Array, segment: Uint8Array) =>
	new Uint8Array([...bytes.subarray(0, 2), ...segment, ...bytes.subarray(2)]);

describe('turnJpeg', () => {
	test.each(TURNED)(
		'shows a picture $turn quarter turns further',
		async ({ turn, ...expected }) => {
			expect(await shown(turnJpeg({ bytes: jpeg(), turn }))).toEqual(expected);
		}
	);

	test.each([1, 2, 3, 4, 5, 6, 7, 8])(
		'goes on from the orientation %i a picture has, in place',
		async (orientation) => {
			const bytes = withSegment(jpeg(), exifSegment({ tag: 0x0112, value: orientation }));
			const once = turnJpeg({ bytes, turn: 1 });
			expect(once.length).toBe(bytes.length);
			const clockwise: Record<string, string> = {
				topLeft: 'topRight',
				topRight: 'bottomRight',
				bottomRight: 'bottomLeft',
				bottomLeft: 'topLeft'
			};
			const before = await shown(bytes);
			expect(await shown(once)).toEqual({
				wide: !before.wide,
				black: before.black.map((corner) => clockwise[corner])
			});
			expect(turnJpeg({ bytes: once, turn: 3 })).toEqual(bytes);
		}
	);

	test('takes the place of Exif that does not say how the picture lies', async () => {
		const bytes = withSegment(jpeg(), exifSegment({ tag: 0x0103, value: 6 }));
		expect(await shown(turnJpeg({ bytes, turn: 2 }))).toEqual({
			wide: true,
			black: ['bottomRight']
		});
	});

	test('changes nothing of the picture itself, nor of the file it is given', () => {
		const bytes = jpeg();
		const before = Uint8Array.from(bytes);
		const turned = turnJpeg({ bytes, turn: 1 });
		expect(bytes).toEqual(before);
		expect(turned.subarray(-(bytes.length - 100))).toEqual(bytes.subarray(100));
	});
});

describe('turnPng', () => {
	test('says how the picture lies, and changes nothing of it', async () => {
		const bytes = png();
		const turned = turnPng({ bytes, turn: 1 });
		if (!turned) throw new Error('not turned');
		// after the header: length, type, data, checksum
		const chunk = Buffer.from(turned.subarray(33, 33 + 12 + 26));
		expect(chunk.readUInt32BE(0)).toBe(26);
		expect(chunk.toString('latin1', 4, 8)).toBe('eXIf');
		expect(chunk.readUInt16BE(8 + 18)).toBe(6);
		expect(chunk.readUInt32BE(34)).toBe(crc32(chunk.subarray(4, 34)));
		expect(new Uint8Array([...turned.subarray(0, 33), ...turned.subarray(33 + 38)])).toEqual(bytes);
		expect((await loadImage(Buffer.from(turned))).width).toBeGreaterThan(0);
	});

	test('leaves one that says so already', () => {
		const once = turnPng({ bytes: png(), turn: 2 });
		expect(once && turnPng({ bytes: once, turn: 2 })).toBeUndefined();
	});
});
