import { logger } from '#lib/logger';

/**
 * The camera as the scanners open it. Asked for nothing, browsers hand out 640×480, in which a
 * dense code printed small (a signed code on paper) has too few pixels to be read unless it is held
 * closer than the camera can focus. So the scanners ask for full HD (`ideal`: a camera with less
 * gives what it has), keep focusing continuously where the camera can, and offer its zoom, so the
 * paper can be held at a distance the camera focuses at and zoomed in on, and its light. Reading a whole page
 * (`page`: its fields too, `#lib/paperScan`) asks for 4K, where the camera has it: the page then
 * fills the picture with a few pixels to each millimetre.
 */

/** One set of constraints `applyConstraints` takes. */
type ConstraintSet = NonNullable<
	NonNullable<Parameters<MediaStreamTrack['applyConstraints']>[0]>['advanced']
>[number];

/** The constraints the browser's types do not know yet (Image Capture). */
interface CameraConstraintSet extends ConstraintSet {
	focusMode?: string;
	zoom?: number;
	torch?: boolean;
}

/** What the camera's zoom can do and where it stands. */
export type CameraZoom = { min: number; max: number; step: number; value: number };

/** One capability or setting of a track by name; the typings only know the older ones. */
function readProperty({ source, name }: { source: object; name: string }): unknown {
	return Object.getOwnPropertyDescriptor(source, name)?.value;
}

const isNumber = (value: unknown): value is number =>
	typeof value === 'number' && Number.isFinite(value);

/** The track's zoom, when it has one that actually zooms. */
function zoomOf(track: MediaStreamTrack): CameraZoom | undefined {
	if (typeof track.getCapabilities !== 'function') return undefined;
	const range = readProperty({ source: track.getCapabilities(), name: 'zoom' });
	if (typeof range !== 'object' || range === null) return undefined;
	const min = readProperty({ source: range, name: 'min' });
	const max = readProperty({ source: range, name: 'max' });
	const step = readProperty({ source: range, name: 'step' });
	if (!isNumber(min) || !isNumber(max) || max <= min) return undefined;
	const value = readProperty({ source: track.getSettings(), name: 'zoom' });
	return {
		min,
		max,
		step: isNumber(step) && step > 0 ? step : 0.1,
		value: isNumber(value) ? value : min
	};
}

/** Whether the track's light is on; `undefined` for a camera without one to switch. */
function torchOf(track: MediaStreamTrack): boolean | undefined {
	if (typeof track.getCapabilities !== 'function') return undefined;
	const able = readProperty({ source: track.getCapabilities(), name: 'torch' });
	// some browsers answer the values it can have
	const has = able === true || (Array.isArray(able) && able.includes(true));
	if (!has) return undefined;
	return readProperty({ source: track.getSettings(), name: 'torch' }) === true;
}

/** Focuses continuously where the camera can; a camera that cannot keeps what it does. */
async function focusContinuously(track: MediaStreamTrack) {
	if (typeof track.getCapabilities !== 'function') return;
	const modes = readProperty({ source: track.getCapabilities(), name: 'focusMode' });
	if (!Array.isArray(modes) || !modes.includes('continuous')) return;
	const advanced: CameraConstraintSet[] = [{ focusMode: 'continuous' }];
	await track.applyConstraints({ advanced }).catch(() => undefined);
}

const videoTrackOf = (stream: MediaStream) => stream.getVideoTracks().at(0);

/** Opens the camera facing `facingMode` for scanning a code, or a whole `page` (see the module comment). */
export async function openScannerCamera({
	facingMode,
	page = false
}: {
	facingMode: 'environment' | 'user';
	page?: boolean;
}) {
	// `ideal` falls back to whatever camera exists, e.g. a laptop's single webcam
	const stream = await navigator.mediaDevices.getUserMedia({
		video: {
			facingMode: { ideal: facingMode },
			width: { ideal: page ? 3840 : 1920 },
			height: { ideal: page ? 2160 : 1080 }
		}
	});
	const track = videoTrackOf(stream);
	if (track) await focusContinuously(track);
	return stream;
}

/** The zoom of the stream's camera, when it has one. */
export function streamZoom(stream: MediaStream) {
	const track = videoTrackOf(stream);
	return track ? zoomOf(track) : undefined;
}

/** Whether the light of the stream's camera is on; `undefined` when it has none to switch. */
export function streamTorch(stream: MediaStream) {
	const track = videoTrackOf(stream);
	return track ? torchOf(track) : undefined;
}

/**
 * Switches the light of the camera `video` shows; answers whether it is on, or undefined once the
 * camera is off. It goes out with the camera.
 */
export async function switchTorch({
	video,
	on
}: {
	video: HTMLVideoElement | undefined;
	on: boolean;
}) {
	const stream = video?.srcObject;
	if (!(stream instanceof MediaStream)) return undefined;
	const track = videoTrackOf(stream);
	if (!track) return undefined;
	const advanced: CameraConstraintSet[] = [{ torch: on }];
	try {
		await track.applyConstraints({ advanced });
	} catch (error) {
		logger.warn('Switching the camera light failed', error);
		return video?.srcObject === stream ? torchOf(track) : undefined;
	}
	// not every browser reports it back in the settings
	return video?.srcObject === stream ? on : undefined;
}

/** Zooms the stream's camera to `value`; answers where it ended up. */
export async function zoomStream({ stream, value }: { stream: MediaStream; value: number }) {
	const track = videoTrackOf(stream);
	if (!track) return undefined;
	const advanced: CameraConstraintSet[] = [{ zoom: value }];
	try {
		await track.applyConstraints({ advanced });
	} catch (error) {
		logger.warn('Zooming the camera failed', error);
	}
	return zoomOf(track);
}

/**
 * Zooms the camera `video` shows to `value`; answers where it ended up, or undefined once the
 * camera is off (also when it went off while zooming, so the slider does not come back).
 */
export async function zoomVideo({
	video,
	value
}: {
	video: HTMLVideoElement | undefined;
	value: number;
}) {
	const stream = video?.srcObject;
	if (!(stream instanceof MediaStream)) return undefined;
	const zoom = await zoomStream({ stream, value });
	return video?.srcObject === stream ? zoom : undefined;
}

/** The picture `video` shows right now, at the camera's full resolution; none before it has one. */
export function captureFrame(video: HTMLVideoElement): ImageData | undefined {
	const { videoWidth: width, videoHeight: height } = video;
	if (width === 0 || height === 0) return undefined;
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const context = canvas.getContext('2d', { willReadFrequently: true });
	if (!context) return undefined;
	context.drawImage(video, 0, 0, width, height);
	return context.getImageData(0, 0, width, height);
}

/** Turns off the camera `video` shows. */
export function stopVideoStream(video: HTMLVideoElement | undefined) {
	// `MediaStream` does not exist during SSR, where this runs as a scanner is torn down.
	if (typeof MediaStream === 'undefined' || !(video?.srcObject instanceof MediaStream)) return;
	video.srcObject.getTracks().forEach((track) => track.stop());
	video.srcObject = null;
}
