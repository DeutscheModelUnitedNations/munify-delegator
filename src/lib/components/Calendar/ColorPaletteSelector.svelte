<script lang="ts">
	import type { CalendarEntryColor } from '@prisma/client';
	import { allColors, getColorConfig } from './calendarColors';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		value: CalendarEntryColor;
		onchange: (color: CalendarEntryColor) => void;
	}

	let { value, onchange }: Props = $props();

	const colorLabels: Record<CalendarEntryColor, () => string> = {
		SESSION: () => m.calendarSession(),
		WORKSHOP: () => m.calendarWorkshop(),
		LOGISTICS: () => m.calendarLogistics(),
		SOCIAL: () => m.calendarSocial(),
		CEREMONY: () => m.calendarCeremony(),
		BREAK: () => m.calendarBreak(),
		HIGHLIGHT: () => m.calendarHighlight(),
		INFO: () => m.calendarInfo()
	};
</script>

<div class="flex flex-wrap gap-2">
	{#each allColors as color (color)}
		{@const config = getColorConfig(color)}
		<button
			type="button"
			class="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all {config.bg} {config.border} border {value ===
			color
				? `ring-2 ${config.ring} ring-offset-1`
				: ''}"
			onclick={() => onchange(color)}
			title={colorLabels[color]()}
		>
			<span class="inline-block h-3 w-3 rounded-full {config.bg} {config.border} border-2"></span>
			{colorLabels[color]()}
		</button>
	{/each}
</div>
