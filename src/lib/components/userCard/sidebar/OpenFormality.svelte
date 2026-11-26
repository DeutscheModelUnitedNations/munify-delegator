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
	class="hover:bg-base-content/5 rounded-field flex w-full cursor-pointer items-center gap-2 py-0.5 text-left text-sm"
	{onclick}
>
	<i aria-hidden="true" class="ph-duotone {look.icon} {look.text} text-lg"></i>
	<span class="min-w-0 flex-1">
		{FORMALITY_META[formality.key].title()}
		<span class="sr-only">({look.label})</span>
	</span>
	<i aria-hidden="true" class="ph-duotone ph-caret-right text-base-content/40 text-xs"></i>
</button>
