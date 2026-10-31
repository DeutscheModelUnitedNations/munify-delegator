import { describe, expect, test } from 'vitest';
import { formatHotkey } from './formatHotkey';

describe('formatHotkey', () => {
	test('elsewhere: mod is Ctrl, keys keep their spelling, joined by +', () => {
		expect(formatHotkey({ hotkey: 'mod+K', isMac: false })).toBe('Ctrl+K');
		expect(formatHotkey({ hotkey: 'alt + shift + Enter', isMac: false })).toBe('alt+shift+Enter');
	});
	test('on a Mac: modifier symbols, joined without separator', () => {
		expect(formatHotkey({ hotkey: 'mod+k', isMac: true })).toBe('⌘k');
		expect(formatHotkey({ hotkey: 'Ctrl+Alt+Shift+Enter', isMac: true })).toBe('⌃⌥⇧↵');
		expect(formatHotkey({ hotkey: 'constructor', isMac: true })).toBe('constructor');
	});
});
