<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { Formality } from '../formalities';
	import { FORMALITY_META } from '../sections/formalityOptions';

	/** One formality still to be settled, opening the tab where it is changed. */
	interface Props {
		formality: Formality;
		onclick: () => void;
	}

	let { formality, onclick }: Props = $props();

	const look = $derived(
		formality.state === 'problem'
			? { text: 'text-error', icon: 'ph-warning', label: m.statusProblem() }
			: { text: 'text-warning', icon: 'ph-hourglass-medium', label: m.statusPending() }
	);
</script>

<button
	type="button"
	class="link link-hover flex items-baseline gap-2 text-left {look.text}"
	{onclick}
>
	<i aria-hidden="true" class="ph-duotone {look.icon} text-xs"></i>
	{FORMALITY_META[formality.key].title()}
	<span class="sr-only">({look.label})</span>
</button>
