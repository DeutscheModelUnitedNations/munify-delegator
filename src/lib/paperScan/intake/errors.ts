/** Thrown for a file that cannot be opened, or is no scan: reading it again changes nothing. */
export class ScanUnreadableError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ScanUnreadableError';
	}
}

/** Thrown for a page that cannot be made a file of its own, or not be read; the others can. */
export class PageError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'PageError';
	}
}

/** Thrown when a file could not be read, which is no fault of its content. */
export class SourceReadError extends Error {
	constructor(cause: unknown) {
		super('The file could not be read', { cause });
		this.name = 'SourceReadError';
	}
}

export const messageOf = (error: unknown) =>
	error instanceof Error ? error.message : String(error);
