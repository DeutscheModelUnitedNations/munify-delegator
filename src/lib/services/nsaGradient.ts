/**
 * Simple hash function for strings (djb2 algorithm)
 */
function hashString(str: string): number {
	let hash = 5381;
	for (let i = 0; i < str.length; i++) {
		hash = (hash * 33) ^ str.charCodeAt(i);
	}
	return hash >>> 0; // Convert to unsigned 32-bit
}

/**
 * Generate two gradient color pairs from an NSA ID
 * Returns HSL colors for consistent, pleasing gradients
 * Same ID will always produce the same gradients
 */
export function getNsaGradients(nsaId: string): {
	gradient1: { from: string; to: string };
	gradient2: { from: string; to: string };
} {
	const hash = hashString(nsaId);

	// Gradient 1: Use hash for hue, fixed saturation/lightness
	const hue1 = hash % 360;
	const hue1End = (hue1 + 40) % 360; // Slight hue shift for gradient

	// Gradient 2: Offset hue using different hash bits for variety
	const hue2 = (((hash >> 8) % 360) + 180) % 360;
	const hue2End = (hue2 + 40) % 360;

	return {
		gradient1: {
			from: `hsl(${hue1}, 70%, 45%)`,
			to: `hsl(${hue1End}, 70%, 55%)`
		},
		gradient2: {
			from: `hsl(${hue2}, 65%, 40%)`,
			to: `hsl(${hue2End}, 65%, 50%)`
		}
	};
}
