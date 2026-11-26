import {
	stopVideoStream,
	streamTorch,
	streamZoom,
	switchTorch,
	zoomVideo,
	type CameraZoom
} from './camera';

/** A running camera's zoom and light, as `ScanViewfinder` shows and switches them. */
export function createCameraControls(video: () => HTMLVideoElement | undefined) {
	let zoom = $state<CameraZoom>();
	let torch = $state<boolean>();

	return {
		/** The camera's zoom, while it streams with one. */
		get zoom() {
			return zoom;
		},
		/** Whether the camera's light is on, while it streams with one. */
		get torch() {
			return torch;
		},
		started(stream: MediaStream) {
			zoom = streamZoom(stream);
			torch = streamTorch(stream);
		},
		/** Turns the camera off, and its light with it. */
		stop() {
			stopVideoStream(video());
			zoom = undefined;
			torch = undefined;
		},
		async zoomTo(value: number) {
			zoom = await zoomVideo({ video: video(), value });
		},
		async switchLight(on: boolean) {
			torch = await switchTorch({ video: video(), on });
		}
	};
}
