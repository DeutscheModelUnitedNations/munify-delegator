const macSymbols: Record<string, string> = {
	alt: '⌥',
	shift: '⇧',
	ctrl: '⌃',
	mod: '⌘',
	enter: '↵'
};

/** One key of a hotkey: `mod` is Cmd on a Mac and Ctrl elsewhere; Macs show modifier symbols. */
function formatKey(part: string, isMac: boolean) {
	const key = part.trim().toLowerCase();
	if (!isMac) return key === 'mod' ? 'Ctrl' : part.trim();
	return Object.hasOwn(macSymbols, key) ? macSymbols[key] : part.trim();
}

/** A hotkey such as `mod+shift+k` as the platform writes it: `⌘⇧k` on a Mac, `Ctrl+shift+k` elsewhere. */
export function formatHotkey(hotkey: string, isMac: boolean) {
	return hotkey
		.split('+')
		.map((part) => formatKey(part, isMac))
		.join(isMac ? '' : '+');
}
