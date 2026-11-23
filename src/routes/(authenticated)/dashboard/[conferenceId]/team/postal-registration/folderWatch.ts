/**
 * Watching a folder for new scans: the one a scanner's program saves to, on this computer or a
 * network drive. Browsers tell of changes only on some drives, so the folder is listed every few
 * seconds. A file is taken once it has stopped growing, and only if it came after the watching
 * began: what lay in the folder before is nobody's to import unasked.
 */

declare global {
	interface Window {
		/** Chromium only, hence optional. */
		showDirectoryPicker?: (options?: { mode?: 'read' }) => Promise<FileSystemDirectoryHandle>;
	}
}

const SCAN_NAME = /\.(pdf|jpe?g|png|webp)$/i;

export const canWatchFolders = () =>
	typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';

/** A file in the folder, as it was listed. */
export interface ListedFile {
	name: string;
	size: number;
	lastModified: number;
}

const versionOf = ({ name, size, lastModified }: ListedFile) => `${name}\n${size}\n${lastModified}`;

/** Tells, from one listing of a folder to the next, which of its files are new and whole. */
export function createFolderTracker(initial: readonly ListedFile[]) {
	/** What is done with: there before, or taken. */
	const settled = new Set(initial.map(versionOf));
	/** New in the last listing, maybe still being written. */
	let growing = new Set<string>();

	return {
		/** The files of a listing to take now, each once. */
		take<F extends ListedFile>(listed: readonly F[]): F[] {
			const ready: F[] = [];
			const seen = new Set<string>();
			for (const file of listed) {
				const version = versionOf(file);
				if (!SCAN_NAME.test(file.name) || file.size === 0 || settled.has(version)) continue;
				if (growing.has(version)) {
					settled.add(version);
					ready.push(file);
				} else seen.add(version);
			}
			growing = seen;
			return ready;
		}
	};
}

/** The scans lying in a folder; one written or removed right now is left for the next time. */
export async function listScans(folder: FileSystemDirectoryHandle): Promise<File[]> {
	const files: File[] = [];
	for await (const entry of folder.values()) {
		if (entry.kind !== 'file' || !SCAN_NAME.test(entry.name)) continue;
		try {
			files.push(await entry.getFile());
		} catch {
			// gone, or locked while the scanner writes it
		}
	}
	return files;
}
