let isOpen = $state(false);
let mounted = $state(false);

/** Called by the palette while it is mounted, so the header only offers a search that exists. */
export function registerCommandPalette() {
	mounted = true;
	return () => {
		mounted = false;
	};
}

export function isCommandPaletteAvailable() {
	return mounted;
}

export function openCommandPalette() {
	isOpen = true;
}

export function closeCommandPalette() {
	isOpen = false;
}

export function toggleCommandPalette() {
	isOpen = !isOpen;
}

export function getCommandPaletteState() {
	return {
		get isOpen() {
			return isOpen;
		}
	};
}
