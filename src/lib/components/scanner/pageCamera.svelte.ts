import { logger } from '#lib/logger';
import { addPicture, mergeFrames, type TakenPage } from '#lib/paperScan/frames';
import {
	missingMark,
	pageTaken,
	startAim,
	trackAim,
	tryAgain,
	type AimHint,
	type AimMark
} from '#lib/paperScan/camera/aim';
import { createPageReader } from '#lib/paperScan/camera/pageReader';
import type { PhotoReading } from '#lib/paperScan/camera/pageReaderProtocol';
import type { PageFile } from '#lib/paperScan/intake/takePage';
import type { FieldReading } from '#lib/paperScan/readPaper';
import { m } from '#lib/paraglide/messages';
import { looksLikeSignedCode } from '#lib/signedCode/signedCode';
import { previewPicture, takePhoto } from './camera';
import { createScanSounds } from './scanSounds';
import { createWakeLock } from './wakeLock';

/**
 * The camera as a scanner: laid over the pages, it reads one after the other while they are slid
 * under it, and nobody touches it. Small pictures of the preview are looked at for the page's corner
 * marks, beside the page (`pageReader`), which tells the person what to do; once a page lies whole and
 * still, one photo is taken and read, and more only while fields are left unclear (`addPicture`). The
 * page is then handed on to be kept (`onPage`) and the camera beeps: the next one may come. What a
 * person has to look at (fields unclear, a code refused, a page not kept) sounds otherwise and pauses
 * the camera until they `resume` it, so the page is not lost in the stack. The screen stays on.
 */

/** A page read by the camera: its bare code, what it says (`null`: not readable), and its photo. */
export interface CameraPage {
	code: string;
	readings: FieldReading[] | null;
	file: PageFile;
}

/** A mark shown over the preview: one seen, or where one not seen should be. */
export type ShownMark = AimMark & { seen: boolean };

/** What the camera tells the person: an aiming hint, or that a photo is being read. */
export type PageCameraHint = AimHint | { kind: 'reading' } | { kind: 'noCode' };

/** What the viewfinder shows of the camera reading pages (`ScanViewfinder`'s `aim`). */
export interface PageAim {
	hint: PageCameraHint;
	marks: ShownMark[];
	flash?: 'success' | 'problem';
	problem?: string;
	onresume: () => void;
}

/** How long the picture flashes green for a page done with, in milliseconds. */
const FLASH_MS = 700;

/** At most this often the preview is looked at, in milliseconds. */
const AIM_EVERY = 120;
/** Photos without a readable code before the page is given up on. */
const MOST_WITHOUT_CODE = 3;

const pause = (milliseconds: number) => new Promise((later) => setTimeout(later, milliseconds));

/** A code as checked: the bare code, or why it is refused. */
export type CodeVerdict = { code: string } | { refused: string };

/** The first of a photo's signed codes, checked, with what it says. */
async function acceptedCode({
	photo,
	accept
}: {
	photo: PhotoReading;
	accept: (text: string) => Promise<CodeVerdict>;
}) {
	const first = photo.codes.find(({ text }) => looksLikeSignedCode(text));
	return first && { ...(await accept(first.text)), readings: first.readings };
}

/** Whether a page's fields were all read: nothing for a person to look at. */
const readClearly = (readings: FieldReading[] | null) =>
	readings !== null && readings.every(({ state }) => state !== 'unclear');

export function createPageCamera({
	video,
	accept,
	onPage,
	onFailed
}: {
	video: () => HTMLVideoElement | undefined;
	/** Checks a code read. */
	accept: (text: string) => Promise<CodeVerdict>;
	/**
	 * Keeps a page done with, read as well as it could be; answers what a person has to look at, if
	 * anything. The camera goes on with the next page meanwhile.
	 */
	onPage: (page: CameraPage) => Promise<string | undefined>;
	/** The page reader does not work here. */
	onFailed: (error: unknown) => void;
}) {
	let hint = $state<PageCameraHint>({ kind: 'findPage' });
	let marks = $state<ShownMark[]>([]);
	/** What a person has to look at; the camera waits while there is something. */
	let problem = $state<string>();
	let flash = $state<'success' | 'problem'>();
	let flashTimer: ReturnType<typeof setTimeout> | undefined;
	const sounds = createScanSounds();
	const wakeLock = createWakeLock();
	/** The code of the page taken last: seen again, it is the same page still lying there. */
	let lastCode: string | undefined;
	let running: object | undefined;
	let reader: ReturnType<typeof createPageReader> | undefined;
	let track = startAim();
	/** The photos of each code's page taken so far, and the last of them. */
	let taken: Record<string, { page: TakenPage; file: PageFile }> = {};
	let withoutCode = 0;

	function show({ aim, next }: { aim: Parameters<typeof missingMark>[0]; next: AimHint }) {
		const missing = missingMark(aim);
		marks = [
			...aim.marks.map((mark) => ({ ...mark, seen: true })),
			...(missing ? [{ ...missing, seen: false }] : [])
		];
		hint = next;
	}

	const fileOf = (bytes: Uint8Array<ArrayBuffer>): PageFile => ({
		name: `camera-${Date.now()}.jpg`,
		type: 'image/jpeg',
		bytes
	});

	function succeed() {
		sounds.success();
		flash = 'success';
		clearTimeout(flashTimer);
		flashTimer = setTimeout(() => {
			if (flash === 'success') flash = undefined;
		}, FLASH_MS);
	}

	/** Something a person has to look at: the camera waits for them. */
	function fail(message: string) {
		if (!running) return;
		clearTimeout(flashTimer);
		problem = message;
		flash = 'problem';
		marks = [];
		sounds.problem();
	}

	/** No code in the photo: another, unless the page has been tried often enough. */
	function noCode() {
		withoutCode += 1;
		if (withoutCode < MOST_WITHOUT_CODE) {
			track = tryAgain(track);
			hint = { kind: 'noCode' };
			return;
		}
		withoutCode = 0;
		track = pageTaken(track);
		fail(m.paperPageNotReadable());
	}

	/** A page done with: it may go, and is kept meanwhile. */
	function finish(page: CameraPage) {
		lastCode = page.code;
		track = pageTaken(track);
		if (readClearly(page.readings)) succeed();
		else fail(page.readings ? m.paperCameraUnclear() : m.paperPageNotReadable());
		void onPage(page).then(
			(said) => said && fail(said),
			(error: unknown) => {
				logger.warn('Keeping a photographed page failed', error);
				fail(m.paperCameraKeepFailed());
			}
		);
	}

	/** One more photo of the page whose code is `code`: done with once the photos settle it. */
	function addPhoto({
		code,
		readings,
		bytes
	}: {
		code: string;
		readings: FieldReading[] | null;
		bytes: Uint8Array<ArrayBuffer>;
	}) {
		withoutCode = 0;
		const before = taken[code];
		if (!before && code === lastCode) {
			// the page taken last, nudged: nothing new
			track = pageTaken(track);
			return;
		}
		const page = addPicture({ taken: before?.page, read: readings });
		// the latest photo the fields were readable in is the page's scan
		const file = readings || !before ? fileOf(bytes) : before.file;
		if (!page.done) {
			taken[code] = { page, file };
			track = tryAgain(track);
			return;
		}
		delete taken[code];
		finish({ code, readings: page.frames.length > 0 ? mergeFrames(page.frames) : null, file });
	}

	async function capture(from: HTMLVideoElement) {
		if (!reader) return;
		hint = { kind: 'reading' };
		const image = await takePhoto(from);
		if (!image) {
			track = tryAgain(track);
			return;
		}
		const photo = await reader.read(image);
		const found = await acceptedCode({ photo, accept });
		if (!found || !photo.file) return noCode();
		if ('refused' in found) {
			// the page in view is not asked about again
			track = pageTaken(track);
			return fail(found.refused);
		}
		addPhoto({ ...found, bytes: photo.file.bytes });
	}

	async function step() {
		const from = video();
		if (problem || !reader || !from || from.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
			return;
		}
		const picture = await previewPicture(from);
		if (!picture) return;
		const aim = await reader.aim(picture);
		const next = trackAim({ track, aim, at: performance.now() });
		track = next.track;
		show({ aim, next: next.hint });
		if (next.hint.kind === 'ready') await capture(from);
	}

	async function loop(run: object) {
		while (running === run) {
			const began = performance.now();
			try {
				await step();
			} catch (error) {
				if (running !== run) return;
				logger.warn('Reading the camera picture failed', error);
				running = undefined;
				onFailed(error);
				return;
			}
			await pause(Math.max(0, AIM_EVERY - (performance.now() - began)));
		}
	}

	return {
		/** What to tell the person holding the page. */
		get hint() {
			return hint;
		},
		/** The page's corner marks in the preview, as shares of it. */
		get marks() {
			return marks;
		},
		/** What a person has to look at before the camera goes on, if anything. */
		get problem() {
			return problem;
		},
		/** How the picture flashes: green for a page done with, red while something is wrong. */
		get flash() {
			return flash;
		},
		/** Goes on after a problem was looked at. */
		resume() {
			sounds.unlock();
			problem = undefined;
			flash = undefined;
		},
		/** Starts looking at the preview, unless it already does. */
		start() {
			if (running) return;
			const run = {};
			running = run;
			reader ??= createPageReader();
			track = startAim();
			lastCode = undefined;
			wakeLock.hold();
			sounds.unlock();
			document.addEventListener('pointerdown', sounds.unlock);
			document.addEventListener('keydown', sounds.unlock);
			void loop(run);
		},
		/** Stops looking; what was taken of a page not done with is dropped. */
		stop() {
			running = undefined;
			reader?.close();
			reader = undefined;
			taken = {};
			marks = [];
			problem = undefined;
			flash = undefined;
			clearTimeout(flashTimer);
			wakeLock.release();
			document.removeEventListener('pointerdown', sounds.unlock);
			document.removeEventListener('keydown', sounds.unlock);
			hint = { kind: 'findPage' };
		}
	};
}
