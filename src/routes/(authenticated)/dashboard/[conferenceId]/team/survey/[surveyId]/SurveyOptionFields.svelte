<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	/** The editable fields of a survey option, for creating one and for editing one. */
	interface Props {
		title: string;
		description: string;
		upperLimit: number;
	}

	let {
		title = $bindable(),
		description = $bindable(),
		upperLimit = $bindable()
	}: Props = $props();
</script>

<fieldset class="fieldset">
	<legend class="fieldset-legend">{m.title()}</legend>
	<input type="text" bind:value={title} class="input w-full" required />
</fieldset>
<fieldset class="fieldset">
	<legend class="fieldset-legend">{m.description()}</legend>
	<textarea bind:value={description} class="textarea w-full"></textarea>
</fieldset>
<fieldset class="fieldset">
	<legend class="fieldset-legend">{m.upperLimit()} ({m.zeroForUnlimited()})</legend>
	<input type="number" bind:value={upperLimit} class="input w-full" min="0" />
</fieldset>
