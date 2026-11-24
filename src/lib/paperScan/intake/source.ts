/**
 * A file read in pieces: one may be gigabytes, and is never in memory as a whole.
 */
export interface ScanSource {
	size: number;
	/** The bytes from `from` up to (without) `to`, both within the file. */
	read(range: { from: number; to: number }): Promise<Uint8Array<ArrayBuffer>>;
}

/** A file in memory. */
export const bytesSource = (bytes: Uint8Array<ArrayBuffer>): ScanSource => ({
	size: bytes.length,
	read: async ({ from, to }) => bytes.subarray(from, to)
});

/** A file the browser holds. */
export const blobSource = (blob: Blob): ScanSource => ({
	size: blob.size,
	read: async ({ from, to }) => new Uint8Array(await blob.slice(from, to).arrayBuffer())
});

const BLOCK = 128 * 1024;
const BLOCKS_KEPT = 32;

/**
 * Reads a source in blocks and keeps the latest few: what belongs together lies together, and each read of
 * the source may be a request. What is larger than a few blocks is read as it is.
 */
export function bufferedSource(source: ScanSource): ScanSource {
	const blocks = new Map<number, Promise<Uint8Array<ArrayBuffer>>>();

	function block(index: number) {
		const known = blocks.get(index);
		// the latest used are kept
		blocks.delete(index);
		const from = index * BLOCK;
		const read = known ?? source.read({ from, to: Math.min(from + BLOCK, source.size) });
		blocks.set(index, read);
		for (const oldest of blocks.keys()) {
			if (blocks.size <= BLOCKS_KEPT) break;
			blocks.delete(oldest);
		}
		// a failed read is none to keep
		read.catch(() => blocks.delete(index));
		return read;
	}

	return {
		size: source.size,
		async read({ from, to }) {
			const first = Math.floor(from / BLOCK);
			const last = Math.floor((Math.max(to, from + 1) - 1) / BLOCK);
			if (last - first >= 4) return source.read({ from, to });
			const bytes = new Uint8Array(Math.max(0, to - from));
			for (let index = first; index <= last; index++) {
				const start = index * BLOCK;
				const part = (await block(index)).subarray(
					Math.max(0, from - start),
					Math.min(BLOCK, to - start)
				);
				bytes.set(part, start + Math.max(0, from - start) - from);
			}
			return bytes;
		}
	};
}
