<script lang="ts">
	import * as m from '$lib/paraglide/messages';

	let { disabled }: { disabled: boolean } = $props();
</script>

<button {disabled} class="btn btn-primary mt-10 w-full">{m.save()}</button>
