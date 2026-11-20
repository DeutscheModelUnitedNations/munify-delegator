/** The colours of a callout (`callout.attrs.color`), as DaisyUI's alert tones. */
const CALLOUT_COLORS = ['info', 'success', 'warning', 'error', 'neutral'] as const;
type CalloutColor = (typeof CALLOUT_COLORS)[number];

/** A callout's colour, `info` for anything unknown. */
export function calloutColor(value: unknown): CalloutColor {
	return CALLOUT_COLORS.find((color) => color === value) ?? 'info';
}

/** The DaisyUI alert class of a callout colour. */
export function calloutClass(value: unknown) {
	const color = calloutColor(value);
	return color === 'neutral' ? 'bg-base-200 border-base-300' : `alert-${color} alert-soft`;
}
