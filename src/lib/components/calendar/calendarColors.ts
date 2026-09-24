import { CalendarEntryColor, type CalendarEntryColor$options } from '$houdini';

interface ColorConfig {
	bg: string;
	border: string;
	text: string;
	ring: string;
}

const colorMap: Record<CalendarEntryColor$options, ColorConfig> = {
	SESSION: {
		bg: 'bg-primary/15',
		border: 'border-primary',
		text: 'text-base-content',
		ring: 'ring-base-content'
	},
	WORKSHOP: {
		bg: 'bg-error/20',
		border: 'border-error',
		text: 'text-error',
		ring: 'ring-error'
	},
	LOGISTICS: {
		bg: 'bg-base-200/20',
		border: 'border-base-content',
		text: 'text-base-content/70',
		ring: 'ring-base-content'
	},
	SOCIAL: {
		bg: 'bg-success/15',
		border: 'border-success',
		text: 'text-success',
		ring: 'ring-success'
	},
	CEREMONY: {
		bg: 'bg-accent/30',
		border: 'border-accent',
		text: 'text-accent',
		ring: 'ring-accent'
	},
	BREAK: {
		bg: 'bg-warning/15',
		border: 'border-warning',
		text: 'text-warning',
		ring: 'ring-warning'
	},
	HIGHLIGHT: {
		bg: 'bg-error/40',
		border: 'border-error',
		text: 'text-error',
		ring: 'ring-error'
	},
	INFO: {
		bg: 'bg-info/15',
		border: 'border-info',
		text: 'text-info',
		ring: 'ring-info'
	}
};

export function getColorConfig(color: CalendarEntryColor$options): ColorConfig {
	return colorMap[color];
}

export const allColors = Object.keys(colorMap) as CalendarEntryColor$options[];
