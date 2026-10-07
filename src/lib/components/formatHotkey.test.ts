import { describe, expect, test } from 'vitest';
import { formatHotkey } from './formatHotkey';

describe('formatHotkey', () => {
	test('elsewhere: mod is Ctrl, keys keep their spelling, joined by +', () => {
		expect(formatHotkey('mod+K', false)).toBe('Ctrl+K');
		expect(formatHotkey('alt + shift + Enter', false)).toBe('alt+shift+Enter');
	});
	test('on a Mac: modifier symbols, joined without separator', () => {
		expect(formatHotkey('mod+k', true)).toBe('⌘k');
		expect(formatHotkey('Ctrl+Alt+Shift+Enter', true)).toBe('⌃⌥⇧↵');
		expect(formatHotkey('constructor', true)).toBe('constructor');
	});
});
