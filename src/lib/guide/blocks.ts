/** The colours of a callout (`callout.attrs.color`), as DaisyUI's alert tones. */
export const CALLOUT_COLORS = ['info', 'success', 'warning', 'error', 'neutral'] as const;
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

/** The icon a new callout gets. */
export const DEFAULT_CALLOUT_ICON = 'info';

/**
 * A callout's Phosphor icon (`callout.attrs.icon`, a name without `ph-`), `info` for anything
 * that is not an icon name. It ends up in a class, so only lower-case words joined by dashes pass.
 */
export function calloutIcon(value: unknown) {
	return typeof value === 'string' && value.length <= 60 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value)
		? value
		: DEFAULT_CALLOUT_ICON;
}
