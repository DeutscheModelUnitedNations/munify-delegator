// js-aruco2 ships no types. Only what `./markers` uses is declared; it is CommonJS that sets
// `AR` on its exports, so it is imported as the default (the module object) everywhere.
declare module 'js-aruco2' {
	interface ArucoPoint {
		x: number;
		y: number;
	}
	interface ArucoMarker {
		id: number;
		corners: ArucoPoint[];
		hammingDistance: number;
	}
	interface ArucoDictionary {
		/** Each marker's bits, row by row, as a string of '0' and '1'. */
		codeList: string[];
		nBits: number;
	}
	interface ArucoDetector {
		detect(image: { width: number; height: number; data: ArrayLike<number> }): ArucoMarker[];
	}
	const aruco: {
		AR: {
			Dictionary: new (name: string) => ArucoDictionary;
			Detector: new (config?: {
				dictionaryName?: string;
				maxHammingDistance?: number;
			}) => ArucoDetector;
		};
	};
	export default aruco;
}
