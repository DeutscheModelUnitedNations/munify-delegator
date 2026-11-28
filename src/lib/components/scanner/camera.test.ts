import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	focusAt,
	openScannerCamera,
	previewPicture,
	stopVideoStream,
	streamTorch,
	streamZoom,
	switchTorch,
	takePhoto,
	tappedPoint,
	zoomStream,
	zoomVideo
} from './camera';

/** A camera track with the given capabilities and settings; `applied` records its constraints. */
function fakeTrack({
	capabilities = {},
	settings = {},
	refuse = false
}: {
	capabilities?: object;
	settings?: Record<string, unknown>;
	refuse?: boolean;
}) {
	const applied: unknown[] = [];
	const track = {
		applied,
		stop: vi.fn(),
		getCapabilities: () => capabilities,
		getSettings: () => settings,
		applyConstraints: async (constraints: { advanced: Record<string, unknown>[] }) => {
			applied.push(constraints);
			if (refuse) throw new Error('refused');
			Object.assign(settings, ...constraints.advanced);
		}
	};
	return track;
}

type FakeTrack = Omit<ReturnType<typeof fakeTrack>, 'getCapabilities'> & {
	getCapabilities?: () => object;
};

/** The fake streams, which the stubbed `MediaStream` (jsdom has none) recognises. */
const streams = new WeakSet<object>();
const FakeMediaStream = { [Symbol.hasInstance]: (value: unknown) => streams.has(Object(value)) };

/** A stream of `tracks`, typed as the browser's. */
function streamOf(...tracks: FakeTrack[]): MediaStream {
	const stream = { getVideoTracks: () => tracks, getTracks: () => tracks };
	streams.add(stream);
	// TYPE-SAFETY-EXCEPTION: the fake implements only what camera.ts calls
	return stream as unknown as MediaStream;
}

/** A video element showing `stream`. */
const videoOf = (stream: MediaStream | null): HTMLVideoElement => {
	const video = document.createElement('video');
	Object.defineProperty(video, 'srcObject', { value: stream, writable: true });
	return video;
};

const zoomRange = { zoom: { min: 1, max: 4, step: 0.5 } };

beforeEach(() => vi.stubGlobal('MediaStream', FakeMediaStream));
afterEach(() => vi.unstubAllGlobals());

describe('streamZoom', () => {
	it('reads the range and where the zoom stands', () => {
		const stream = streamOf(fakeTrack({ capabilities: zoomRange, settings: { zoom: 2 } }));
		expect(streamZoom(stream)).toEqual({ min: 1, max: 4, step: 0.5, value: 2 });
	});

	it('falls back to the smallest zoom and a fine step', () => {
		const stream = streamOf(fakeTrack({ capabilities: { zoom: { min: 1, max: 3 } } }));
		expect(streamZoom(stream)).toEqual({ min: 1, max: 3, step: 0.1, value: 1 });
	});

	it('offers no zoom for a camera that cannot, or a range that does not zoom', () => {
		expect(streamZoom(streamOf(fakeTrack({})))).toBeUndefined();
		expect(streamZoom(streamOf(fakeTrack({ capabilities: { zoom: 2 } })))).toBeUndefined();
		const flat = fakeTrack({ capabilities: { zoom: { min: 1, max: 1 } } });
		expect(streamZoom(streamOf(flat))).toBeUndefined();
		expect(streamZoom(streamOf())).toBeUndefined();
	});

	it('offers no zoom where the browser knows no capabilities', () => {
		const track = { ...fakeTrack({}), getCapabilities: undefined };
		expect(streamZoom(streamOf(track))).toBeUndefined();
	});
});

describe('zoomStream', () => {
	it('zooms and answers where it ended up', async () => {
		const stream = streamOf(fakeTrack({ capabilities: zoomRange, settings: { zoom: 1 } }));
		expect(await zoomStream({ stream, value: 3 })).toMatchObject({ value: 3 });
	});

	it('keeps the zoom where the camera refuses', async () => {
		const stream = streamOf(
			fakeTrack({ capabilities: zoomRange, settings: { zoom: 1 }, refuse: true })
		);
		expect(await zoomStream({ stream, value: 3 })).toMatchObject({ value: 1 });
	});

	it('answers nothing for a stream without a camera', async () => {
		expect(await zoomStream({ stream: streamOf(), value: 2 })).toBeUndefined();
	});
});

describe('zoomVideo', () => {
	it('zooms the camera the video shows', async () => {
		const video = videoOf(streamOf(fakeTrack({ capabilities: zoomRange, settings: {} })));
		expect(await zoomVideo({ video, value: 2 })).toMatchObject({ value: 2 });
	});

	it('answers nothing once the camera is off, also when it went off while zooming', async () => {
		expect(await zoomVideo({ video: undefined, value: 2 })).toBeUndefined();
		expect(await zoomVideo({ video: videoOf(null), value: 2 })).toBeUndefined();
		const video = videoOf(streamOf(fakeTrack({ capabilities: zoomRange, settings: {} })));
		const zooming = zoomVideo({ video, value: 2 });
		stopVideoStream(video);
		expect(await zooming).toBeUndefined();
	});
});

describe('stopVideoStream', () => {
	it('stops every track and lets go of the stream', () => {
		const track = fakeTrack({});
		const video = videoOf(streamOf(track));
		stopVideoStream(video);
		expect(track.stop).toHaveBeenCalled();
		expect(video.srcObject).toBeNull();
	});

	it('does nothing without a camera, or where streams do not exist (SSR)', () => {
		expect(() => stopVideoStream(undefined)).not.toThrow();
		vi.unstubAllGlobals();
		vi.stubGlobal('MediaStream', undefined);
		expect(() => stopVideoStream(undefined)).not.toThrow();
	});
});

describe('openScannerCamera', () => {
	function fakeCamera(track: ReturnType<typeof fakeTrack>) {
		const getUserMedia = vi.fn(async () => streamOf(track));
		vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
		return getUserMedia;
	}

	it('asks for full HD facing the given way and focuses continuously', async () => {
		const track = fakeTrack({ capabilities: { focusMode: ['manual', 'continuous'] } });
		const getUserMedia = fakeCamera(track);
		await openScannerCamera({ facingMode: 'environment' });
		expect(getUserMedia).toHaveBeenCalledWith({
			video: {
				facingMode: { ideal: 'environment' },
				width: { ideal: 1920 },
				height: { ideal: 1080 }
			}
		});
		expect(track.applied).toEqual([{ advanced: [{ focusMode: 'continuous' }] }]);
	});

	it('asks for full HD to read a whole page where the camera takes photos of its own', async () => {
		vi.stubGlobal('ImageCapture', class {});
		const getUserMedia = fakeCamera(fakeTrack({ capabilities: {} }));
		await openScannerCamera({ facingMode: 'environment', page: true });
		expect(getUserMedia).toHaveBeenCalledWith({
			video: {
				facingMode: { ideal: 'environment' },
				width: { ideal: 1920 },
				height: { ideal: 1080 }
			}
		});
	});

	it('asks for 4K to read a whole page off the video', async () => {
		const getUserMedia = fakeCamera(fakeTrack({ capabilities: {} }));
		await openScannerCamera({ facingMode: 'environment', page: true });
		expect(getUserMedia).toHaveBeenCalledWith({
			video: {
				facingMode: { ideal: 'environment' },
				width: { ideal: 3840 },
				height: { ideal: 2160 }
			}
		});
	});

	it('leaves the focus of a camera that cannot focus continuously, or refuses to', async () => {
		const fixed = fakeTrack({ capabilities: { focusMode: ['manual'] } });
		fakeCamera(fixed);
		await openScannerCamera({ facingMode: 'user' });
		expect(fixed.applied).toEqual([]);

		const refusing = fakeTrack({ capabilities: { focusMode: ['continuous'] }, refuse: true });
		fakeCamera(refusing);
		await expect(openScannerCamera({ facingMode: 'user' })).resolves.toBeDefined();
	});
});

/** A video of `width` × `height` showing `stream`. */
function sizedVideo({
	stream,
	width,
	height
}: {
	stream: MediaStream | null;
	width: number;
	height: number;
}) {
	const video = videoOf(stream);
	Object.defineProperty(video, 'videoWidth', { value: width });
	Object.defineProperty(video, 'videoHeight', { value: height });
	return video;
}

describe('previewPicture', () => {
	it('takes the picture small enough to aim by', async () => {
		const createImageBitmap = vi.fn(async () => 'bitmap');
		vi.stubGlobal('createImageBitmap', createImageBitmap);
		const video = sizedVideo({ stream: null, width: 3840, height: 2160 });
		expect(await previewPicture(video)).toBe('bitmap');
		expect(createImageBitmap).toHaveBeenCalledWith(video, {
			resizeWidth: 1280,
			resizeHeight: 720,
			resizeQuality: 'low'
		});
	});

	it('takes nothing before the video shows a picture', async () => {
		expect(await previewPicture(sizedVideo({ stream: null, width: 0, height: 0 }))).toBeUndefined();
	});
});

describe('takePhoto', () => {
	/** A camera whose photos are `photo`, or that refuses; `settings` records what it was asked. */
	function fakeImageCapture({ photo, refuse = false }: { photo: Blob; refuse?: boolean }) {
		const settings: unknown[] = [];
		vi.stubGlobal(
			'ImageCapture',
			class {
				getPhotoCapabilities = async () => ({
					imageWidth: { max: 4032 },
					fillLightMode: ['auto', 'off', 'flash']
				});
				takePhoto = async (asked: unknown) => {
					settings.push(asked);
					if (refuse) throw new Error('busy');
					return photo;
				};
			}
		);
		return settings;
	}

	const liveTrack = (torch = false) =>
		Object.assign(fakeTrack({ capabilities: { torch: true }, settings: { torch } }), {
			readyState: 'live'
		});

	it("takes the camera's own photo, at its largest and without the flash", async () => {
		const photo = new Blob(['jpeg']);
		const settings = fakeImageCapture({ photo });
		const video = sizedVideo({ stream: streamOf(liveTrack()), width: 1920, height: 1080 });
		expect(await takePhoto(video)).toBe(photo);
		expect(settings).toEqual([{ imageWidth: 4032, fillLightMode: 'off' }]);
	});

	it('leaves the light alone while it is on', async () => {
		const settings = fakeImageCapture({ photo: new Blob(['jpeg']) });
		await takePhoto(sizedVideo({ stream: streamOf(liveTrack(true)), width: 1920, height: 1080 }));
		expect(settings).toEqual([{ imageWidth: 4032 }]);
	});

	it("takes the video's picture where the camera refuses, or takes no photos", async () => {
		fakeImageCapture({ photo: new Blob(['jpeg']), refuse: true });
		const createImageBitmap = vi.fn(async () => 'frame');
		vi.stubGlobal('createImageBitmap', createImageBitmap);
		const video = sizedVideo({ stream: streamOf(liveTrack()), width: 3840, height: 2160 });
		expect(await takePhoto(video)).toBe('frame');
		vi.stubGlobal('ImageCapture', undefined);
		expect(await takePhoto(video)).toBe('frame');
		expect(createImageBitmap).toHaveBeenCalledWith(video);
	});

	it('takes nothing before the video shows a picture', async () => {
		expect(await takePhoto(sizedVideo({ stream: null, width: 0, height: 0 }))).toBeUndefined();
	});
});

describe('tappedPoint', () => {
	const box = { left: 100, top: 50, width: 400, height: 200 };

	it('answers where in the picture it was tapped', () => {
		expect(tappedPoint({ box, at: { x: 200, y: 100 }, byPointer: true })).toEqual({
			x: 0.25,
			y: 0.25
		});
	});

	it('takes the middle from the keyboard, or of a picture not laid out', () => {
		expect(tappedPoint({ box, at: { x: 0, y: 0 }, byPointer: false })).toEqual({ x: 0.5, y: 0.5 });
		const flat = { ...box, width: 0 };
		expect(tappedPoint({ box: flat, at: { x: 0, y: 0 }, byPointer: true })).toEqual({
			x: 0.5,
			y: 0.5
		});
	});
});

describe('focusAt', () => {
	it('focuses on the point tapped', async () => {
		const track = fakeTrack({});
		await focusAt({ video: videoOf(streamOf(track)), x: 0.25, y: 0.75 });
		expect(track.applied).toEqual([{ advanced: [{ pointsOfInterest: [{ x: 0.25, y: 0.75 }] }] }]);
	});

	it('does nothing where the camera refuses, or is off', async () => {
		const refusing = fakeTrack({ refuse: true });
		await expect(
			focusAt({ video: videoOf(streamOf(refusing)), x: 0, y: 0 })
		).resolves.toBeUndefined();
		await expect(focusAt({ video: undefined, x: 0, y: 0 })).resolves.toBeUndefined();
	});
});

describe('streamTorch', () => {
	it('answers whether the light is on, and undefined for a camera without one', () => {
		const lit = fakeTrack({ capabilities: { torch: true }, settings: { torch: true } });
		expect(streamTorch(streamOf(lit))).toBe(true);
		expect(streamTorch(streamOf(fakeTrack({ capabilities: { torch: [false, true] } })))).toBe(
			false
		);
		expect(streamTorch(streamOf(fakeTrack({ capabilities: { torch: false } })))).toBeUndefined();
		expect(streamTorch(streamOf(fakeTrack({})))).toBeUndefined();
		expect(streamTorch(streamOf())).toBeUndefined();
	});
});

describe('switchTorch', () => {
	it('switches the light and answers where it stands', async () => {
		const track = fakeTrack({ capabilities: { torch: true } });
		const video = videoOf(streamOf(track));
		expect(await switchTorch({ video, on: true })).toBe(true);
		expect(await switchTorch({ video, on: false })).toBe(false);
		expect(track.applied).toEqual([
			{ advanced: [{ torch: true }] },
			{ advanced: [{ torch: false }] }
		]);
	});

	it('answers where it was when the camera refuses', async () => {
		const track = fakeTrack({ capabilities: { torch: true }, refuse: true });
		expect(await switchTorch({ video: videoOf(streamOf(track)), on: true })).toBe(false);
	});

	it('answers nothing once the camera is off', async () => {
		expect(await switchTorch({ video: undefined, on: true })).toBeUndefined();
		expect(await switchTorch({ video: videoOf(null), on: true })).toBeUndefined();
		expect(await switchTorch({ video: videoOf(streamOf()), on: true })).toBeUndefined();
	});
});
