<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { createDraft } from './debounced.svelte';

	interface Props {
		value: unknown;
		onchange: (value: string) => void;
	}

	let { value, onchange }: Props = $props();

	const draft = createDraft({ onsettle: (text) => onchange(text) });
</script>

<input
	type="text"
	class="input input-bordered input-sm w-full"
	placeholder={m.dataGridValue()}
	aria-label={m.dataGridValue()}
	value={draft.shown(typeof value === 'string' ? value : '')}
	oninput={(event) => draft.type(event.currentTarget.value)}
	onblur={() => draft.settle()}
/>
