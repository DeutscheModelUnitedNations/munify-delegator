import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { Aim } from '#lib/paperScan/camera/aim';
import type { PhotoReading } from '#lib/paperScan/camera/pageReaderProtocol';
import type { FieldReading } from '#lib/paperScan/readPaper';
import { createPageCamera, type CameraPage, type CodeVerdict } from './pageCamera.svelte';

const { reader, sounds } = vi.hoisted(() => ({
	reader: {
		aim: vi.fn<(image: unknown) => Promise<Aim>>(),
		read: vi.fn<(image: unknown) => Promise<PhotoReading>>(),
		close: vi.fn()
	},
	sounds: { unlock: vi.fn(), success: vi.fn(), problem: vi.fn(), unlocked: true }
}));

vi.mock('#lib/paperScan/camera/pageReader', () => ({ createPageReader: () => reader }));
vi.mock('./camera', () => ({
	previewPicture: async () => 'preview',
	takePhoto: async () => 'photo'
}));
vi.mock('./scanSounds', () => ({ createScanSounds: () => sounds }));
vi.mock('./wakeLock', () => ({ createWakeLock: () => ({ hold: vi.fn(), release: vi.fn() }) }));
vi.mock('#lib/signedCode/signedCode', () => ({
	looksLikeSignedCode: (text: string) => text.startsWith('signed:')
}));

/** A page lying still in the middle of the picture, moved down by `shift`. */
const pageAt = (shift = 0): Aim => ({
	width: 1000,
	height: 1000,
	dark: false,
	marks: [
		{ corner: 0, at: { x: 0.1, y: 0.1 + shift } },
		{ corner: 1, at: { x: 0.9, y: 0.1 + shift } },
		{ corner: 2, at: { x: 0.9, y: 0.9 + shift } },
		{ corner: 3, at: { x: 0.1, y: 0.9 + shift } }
	]
});

const signed: FieldReading[] = [{ field: 'termsSignature', state: 'yes' }];
const unclear: FieldReading[] = [{ field: 'termsSignature', state: 'unclear' }];
const photoOf = (readings: FieldReading[] | null, text = 'signed:page'): PhotoReading => ({
	codes: [{ text, readings }],
	file: { bytes: new Uint8Array([1, 2, 3]), type: 'image/jpeg' }
});

const accepting = async (text: string): Promise<CodeVerdict> => ({
	code: text.slice('signed:'.length)
});

function setUp({
	accept = accepting,
	keep = async () => undefined
}: {
	accept?: (text: string) => Promise<CodeVerdict>;
	keep?: (page: CameraPage) => Promise<string | undefined>;
} = {}) {
	const pages: CameraPage[] = [];
	const video = document.createElement('video');
	Object.defineProperty(video, 'readyState', { value: HTMLMediaElement.HAVE_ENOUGH_DATA });
	const camera = createPageCamera({
		video: () => video,
		accept,
		onPage: (page) => {
			pages.push(page);
			return keep(page);
		},
		onFailed: vi.fn()
	});
	camera.start();
	return { camera, pages };
}

const waitFor = (check: () => void) => vi.waitFor(check, { timeout: 5000 });

beforeEach(() => reader.aim.mockResolvedValue(pageAt()));
afterEach(() => vi.clearAllMocks());

describe('createPageCamera', () => {
	test('reads a page lying still once, beeps, and waits for the next', async () => {
		reader.read.mockResolvedValue(photoOf(signed));
		const { camera, pages } = setUp();
		await waitFor(() => expect(pages).toHaveLength(1));
		expect(pages[0]).toMatchObject({
			code: 'page',
			readings: signed,
			file: { type: 'image/jpeg' }
		});
		expect(sounds.success).toHaveBeenCalledTimes(1);
		expect(camera.flash).toBe('success');
		await waitFor(() => expect(camera.hint).toEqual({ kind: 'nextPage' }));
		expect(reader.read).toHaveBeenCalledTimes(1);
		expect(camera.problem).toBeUndefined();
		camera.stop();
	});

	test('reads the next page slid under it, without anybody touching anything', async () => {
		reader.read
			.mockResolvedValueOnce(photoOf(signed, 'signed:first'))
			.mockResolvedValue(photoOf(signed, 'signed:second'));
		const { camera, pages } = setUp();
		await waitFor(() => expect(pages).toHaveLength(1));
		reader.aim.mockResolvedValue(pageAt(0.08));
		await waitFor(() => expect(pages.map(({ code }) => code)).toEqual(['first', 'second']));
		expect(sounds.success).toHaveBeenCalledTimes(2);
		camera.stop();
	});

	test('takes the same page nudged for nothing new', async () => {
		reader.read.mockResolvedValue(photoOf(signed));
		const { camera, pages } = setUp();
		await waitFor(() => expect(pages).toHaveLength(1));
		reader.aim.mockResolvedValue(pageAt(0.08));
		await waitFor(() => expect(reader.read).toHaveBeenCalledTimes(2));
		await waitFor(() => expect(camera.hint).toEqual({ kind: 'nextPage' }));
		expect(pages).toHaveLength(1);
		expect(sounds.success).toHaveBeenCalledTimes(1);
		camera.stop();
	});

	test('takes another photo while a field is unclear, done with the first that settles it', async () => {
		reader.read.mockResolvedValueOnce(photoOf(unclear)).mockResolvedValue(photoOf(signed));
		const { camera, pages } = setUp();
		await waitFor(() => expect(pages).toHaveLength(1));
		expect(reader.read).toHaveBeenCalledTimes(2);
		expect(pages[0].readings).toEqual(signed);
		camera.stop();
	});

	test('keeps a page left unclear after three photos, and waits for a person', async () => {
		reader.read.mockResolvedValue(photoOf(unclear));
		const { camera, pages } = setUp();
		await waitFor(() => expect(pages).toHaveLength(1));
		expect(reader.read).toHaveBeenCalledTimes(3);
		expect(pages[0].readings).toEqual(unclear);
		expect(camera.problem).toBeTruthy();
		expect(camera.flash).toBe('problem');
		expect(sounds.problem).toHaveBeenCalledTimes(1);
		expect(sounds.success).not.toHaveBeenCalled();
		// paused: nothing more is looked at until a person goes on
		const asked = reader.aim.mock.calls.length;
		await new Promise((later) => setTimeout(later, 400));
		expect(reader.aim.mock.calls.length).toBe(asked);
		camera.resume();
		expect(camera.problem).toBeUndefined();
		await waitFor(() => expect(reader.aim.mock.calls.length).toBeGreaterThan(asked));
		camera.stop();
	});

	test('waits for a person when the page could not be kept', async () => {
		reader.read.mockResolvedValue(photoOf(signed));
		const { camera } = setUp({ keep: async () => 'Not registered' });
		await waitFor(() => expect(camera.problem).toBe('Not registered'));
		expect(sounds.success).toHaveBeenCalledTimes(1);
		expect(sounds.problem).toHaveBeenCalledTimes(1);
		camera.stop();
	});

	test('waits for a person once no code could be read off the page in three photos', async () => {
		reader.read.mockResolvedValue({ codes: [] });
		const { camera, pages } = setUp();
		await waitFor(() => expect(camera.problem).toBeTruthy());
		expect(reader.read).toHaveBeenCalledTimes(3);
		expect(pages).toHaveLength(0);
		camera.stop();
	});

	test('waits for a person when the code is refused, and does not ask about the page again', async () => {
		reader.read.mockResolvedValue(photoOf(signed));
		const accept = vi.fn(async (): Promise<CodeVerdict> => ({ refused: 'Another conference' }));
		const { camera, pages } = setUp({ accept });
		await waitFor(() => expect(camera.problem).toBe('Another conference'));
		camera.resume();
		await waitFor(() => expect(camera.hint).toEqual({ kind: 'nextPage' }));
		expect(accept).toHaveBeenCalledTimes(1);
		expect(pages).toHaveLength(0);
		camera.stop();
	});

	test('stops the reader when stopped', () => {
		const { camera } = setUp();
		camera.stop();
		expect(reader.close).toHaveBeenCalled();
	});
});
