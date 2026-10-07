<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	interface Props {
		name: string;
		abbreviation: string;
	}

	let { name = $bindable(), abbreviation = $bindable() }: Props = $props();
</script>

<div class="flex flex-col gap-4">
	<label class="floating-label">
		<span>{m.name()}</span>
		<input class="input w-full" placeholder={m.name()} bind:value={name} />
	</label>
	<label class="floating-label">
		<span>{m.abbreviation()}</span>
		<input class="input w-full" placeholder={m.abbreviation()} bind:value={abbreviation} />
	</label>
</div>
