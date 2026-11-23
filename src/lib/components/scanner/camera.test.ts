import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	captureFrame,
	openScannerCamera,
	stopVideoStream,
	streamZoom,
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

	it('asks for 4K to read a whole page', async () => {
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

describe('captureFrame', () => {
	/** A video showing a picture of `width` × `height`, and the canvas a frame is drawn on. */
	function videoOf({ width, height }: { width: number; height: number }) {
		const frame = { width, height, data: new Uint8ClampedArray(width * height * 4) };
		const drawImage = vi.fn();
		const context = { drawImage, getImageData: vi.fn(() => frame) };
		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
			// TYPE-SAFETY-EXCEPTION: jsdom has no canvas; the fake answers what captureFrame uses
			() => context as unknown as CanvasRenderingContext2D
		);
		const video = document.createElement('video');
		Object.defineProperty(video, 'videoWidth', { value: width });
		Object.defineProperty(video, 'videoHeight', { value: height });
		return { video, frame, drawImage };
	}

	it("takes the picture at the camera's full resolution", () => {
		const { video, frame, drawImage } = videoOf({ width: 3840, height: 2160 });
		expect(captureFrame(video)).toBe(frame);
		expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 3840, 2160);
	});

	it('takes nothing before the video shows a picture', () => {
		expect(captureFrame(videoOf({ width: 0, height: 0 }).video)).toBeUndefined();
	});
});
