import type { CalendarEntryColor } from '@prisma/client';

interface ColorConfig {
	bg: string;
	border: string;
	text: string;
	ring: string;
}

const colorMap: Record<CalendarEntryColor, ColorConfig> = {
	SESSION: {
		bg: 'bg-info/15',
		border: 'border-info/40',
		text: 'text-info',
		ring: 'ring-info'
	},
	WORKSHOP: {
		bg: 'bg-primary/15',
		border: 'border-primary/40',
		text: 'text-primary',
		ring: 'ring-primary'
	},
	LOGISTICS: {
		bg: 'bg-base-300',
		border: 'border-base-content/20',
		text: 'text-base-content/70',
		ring: 'ring-base-content'
	},
	SOCIAL: {
		bg: 'bg-success/15',
		border: 'border-success/40',
		text: 'text-success',
		ring: 'ring-success'
	},
	CEREMONY: {
		bg: 'bg-secondary/15',
		border: 'border-secondary/40',
		text: 'text-secondary',
		ring: 'ring-secondary'
	},
	BREAK: {
		bg: 'bg-warning/15',
		border: 'border-warning/40',
		text: 'text-warning',
		ring: 'ring-warning'
	},
	HIGHLIGHT: {
		bg: 'bg-error/15',
		border: 'border-error/40',
		text: 'text-error',
		ring: 'ring-error'
	},
	INFO: {
		bg: 'bg-accent/15',
		border: 'border-accent/40',
		text: 'text-accent',
		ring: 'ring-accent'
	}
};

export function getColorConfig(color: CalendarEntryColor): ColorConfig {
	return colorMap[color];
}

export const allColors: CalendarEntryColor[] = [
	'SESSION',
	'WORKSHOP',
	'LOGISTICS',
	'SOCIAL',
	'CEREMONY',
	'BREAK',
	'HIGHLIGHT',
	'INFO'
];
