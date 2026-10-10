import { writable } from 'svelte/store';

export interface PaperStats {
	words: number;
	characters: number;
	paragraphs: number;
	readingTimeMinutes: number;
}

export const paperStatsStore = writable<PaperStats>({
	words: 0,
	characters: 0,
	paragraphs: 0,
	readingTimeMinutes: 0
});
