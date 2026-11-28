import type { Aim } from './aim';
import type { PageReaderResponse, PageReaderTask, PhotoReading } from './pageReaderProtocol';

/**
 * The page reader (`pageReader.worker.ts`), started on first use: aims by small pictures of the
 * preview and reads photos without holding up the page. One question at a time is the caller's.
 */
export function createPageReader() {
	let worker: Worker | undefined;
	let asked = 0;
	const waiting = new Map<
		number,
		{ resolve: (response: PageReaderResponse) => void; reject: (error: Error) => void }
	>();

	function failAll(error: Error) {
		for (const { reject } of waiting.values()) reject(error);
		waiting.clear();
	}

	function started() {
		if (worker) return worker;
		const created = new Worker(new URL('./pageReader.worker.ts', import.meta.url), {
			type: 'module'
		});
		created.addEventListener('message', (event: MessageEvent<PageReaderResponse>) => {
			const answer = waiting.get(event.data.id);
			waiting.delete(event.data.id);
			answer?.resolve(event.data);
		});
		created.addEventListener('error', (event) => {
			failAll(new Error(event.message || 'The page reader failed'));
			created.terminate();
			if (worker === created) worker = undefined;
		});
		worker = created;
		return created;
	}

	function ask(task: PageReaderTask): Promise<PageReaderResponse> {
		const id = ++asked;
		const target = started();
		return new Promise((resolve, reject) => {
			waiting.set(id, { resolve, reject });
			target.postMessage({ ...task, id }, task.image instanceof ImageBitmap ? [task.image] : []);
		});
	}

	return {
		/** What a small picture of the preview shows of a page; the picture goes to the reader. */
		async aim(image: ImageBitmap): Promise<Aim> {
			const answer = await ask({ kind: 'aim', image });
			if (answer.kind !== 'aim') throw new Error(answer.kind === 'failed' ? answer.error : 'aim');
			return answer.aim;
		},
		/** A photo of a page, read (`PhotoReading`). */
		async read(image: Blob | ImageBitmap): Promise<PhotoReading> {
			const answer = await ask({ kind: 'read', image });
			if (answer.kind !== 'read') throw new Error(answer.kind === 'failed' ? answer.error : 'read');
			return answer.photo;
		},
		/** Stops the reader; what was asked fails. */
		close() {
			worker?.terminate();
			worker = undefined;
			failAll(new Error('The page reader was closed'));
		}
	};
}
