let isOpen = $state(false);

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
