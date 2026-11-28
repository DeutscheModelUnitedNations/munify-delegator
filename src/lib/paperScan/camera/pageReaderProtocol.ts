import type { ReadPage } from '../intake/pages';
import type { Aim } from './aim';

/** What the page reader (`pageReader.worker.ts`) is asked: to aim by a small picture, or to read a photo. */
export type PageReaderTask =
	{ kind: 'aim'; image: ImageBitmap } | { kind: 'read'; image: Blob | ImageBitmap };

export type PageReaderRequest = PageReaderTask & { id: number };

/**
 * A photo of a page, read: its codes, unchecked, with what each says of the fields (`null`: not
 * readable in it), and, where one of them is a signed code, the photo as it is kept, upright.
 */
export interface PhotoReading {
	codes: ReadPage['codes'];
	file?: { bytes: Uint8Array<ArrayBuffer>; type: 'image/jpeg' };
}

export type PageReaderResponse = { id: number } & (
	| { kind: 'aim'; aim: Aim }
	| { kind: 'read'; photo: PhotoReading }
	| { kind: 'failed'; error: string }
);
