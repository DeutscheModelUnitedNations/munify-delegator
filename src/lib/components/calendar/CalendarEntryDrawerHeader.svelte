<script lang="ts">
	import { Drawer } from 'vaul-svelte';
	import type { DrawerDirection } from 'vaul-svelte';
	import { getColorConfig } from './calendarColors';
	import { translateCalendarEntryColor } from '$lib/utils/enumTranslations';
	import type { CalendarEntry } from './calendarTypes';

	interface Props {
		entry: Pick<CalendarEntry, 'name' | 'color' | 'fontAwesomeIcon'>;
		direction: DrawerDirection;
		onClose: () => void;
	}

	let { entry, direction, onClose }: Props = $props();

	let colorConfig = $derived(getColorConfig(entry.color));
	let colorLabel = $derived(translateCalendarEntryColor(entry.color));
</script>

<div
	class="{colorConfig.bg} border-b {colorConfig.border} px-5 {direction === 'bottom'
		? 'rounded-t-2xl pt-2 pb-4'
		: 'py-4'}"
>
	{#if direction === 'bottom'}
		<div class="flex justify-center pb-3 pt-1">
			<div class="bg-base-content/30 h-1.5 w-12 rounded-full"></div>
		</div>
	{/if}
	<div class="flex items-start gap-3">
		{#if entry.fontAwesomeIcon}
			<i class="fa-solid fa-{entry.fontAwesomeIcon} {colorConfig.text} mt-0.5 text-xl"></i>
		{/if}
		<div class="min-w-0 flex-1">
			<Drawer.Title class="text-lg font-bold leading-tight">
				{entry.name}
			</Drawer.Title>
			<span
				class="{colorConfig.text} mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium {colorConfig.bg} ring-1 {colorConfig.ring}"
			>
				{colorLabel}
			</span>
		</div>
		<button
			type="button"
			class="btn btn-ghost btn-sm btn-square"
			onclick={onClose}
			aria-label="Close"
		>
			<i class="fa-solid fa-xmark text-lg"></i>
		</button>
	</div>
</div>
