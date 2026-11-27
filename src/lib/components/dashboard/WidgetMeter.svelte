<!--
	@component
	A labelled share of a whole on a team overview widget: the label, "value / max · percent" and a
	bar. The bar is a native `progress` element, so assistive technology reads the share; the text
	says it too, never the colour alone.
-->
<script lang="ts">
	import { getLocale } from '#lib/paraglide/runtime';

	interface Props {
		label: string;
		value: number;
		max: number;
		/** daisyUI progress colour */
		tone?: 'primary' | 'accent' | 'secondary';
	}

	let { label, value, max, tone = 'primary' }: Props = $props();

	const percent = $derived(max > 0 ? Math.round((value / max) * 100) : 0);
	const number = (n: number) => n.toLocaleString(getLocale());
	const toneClass = $derived(
		{ primary: 'progress-primary', accent: 'progress-accent', secondary: 'progress-secondary' }[
			tone
		]
	);
</script>

<div class="flex flex-col gap-1">
	<div class="flex justify-between gap-3 text-sm">
		<span>{label}</span>
		<span class="tabular-nums"><b>{number(value)}</b> / {number(max)} · {percent}&thinsp;%</span>
	</div>
	<progress
		class="progress {toneClass} h-2.5 w-full"
		{value}
		max={Math.max(max, 1)}
		aria-label={label}
	></progress>
</div>
