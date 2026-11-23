import { describe, expect, test } from 'vitest';
import { createFolderTracker, type ListedFile } from './folderWatch';

const file = (name: string, size = 10, lastModified = 1): ListedFile => ({
	name,
	size,
	lastModified
});

describe('createFolderTracker', () => {
	test('takes a new scan once it has stopped growing, and once only', () => {
		const tracker = createFolderTracker([]);
		expect(tracker.take([file('a.pdf', 10)])).toEqual([]);
		// still being written
		expect(tracker.take([file('a.pdf', 20, 2)])).toEqual([]);
		expect(tracker.take([file('a.pdf', 20, 2)])).toEqual([file('a.pdf', 20, 2)]);
		expect(tracker.take([file('a.pdf', 20, 2)])).toEqual([]);
	});

	test('leaves what was there before, unless it is written anew', () => {
		const tracker = createFolderTracker([file('old.pdf')]);
		tracker.take([file('old.pdf')]);
		expect(tracker.take([file('old.pdf')])).toEqual([]);
		tracker.take([file('old.pdf', 12, 5)]);
		expect(tracker.take([file('old.pdf', 12, 5)])).toEqual([file('old.pdf', 12, 5)]);
	});

	test('leaves what is no scan, and empty files', () => {
		const tracker = createFolderTracker([]);
		const listed = [file('notes.txt'), file('a.pdf', 0), file('.DS_Store'), file('b.JPG')];
		tracker.take(listed);
		expect(tracker.take(listed)).toEqual([file('b.JPG')]);
	});
});
