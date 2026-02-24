<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	interface Props {
		error: unknown;
	}

	let { error }: Props = $props();
	let expanded = $state(false);
</script>

<div class="alert alert-error alert-soft">
	<i class="fa-solid fa-triangle-exclamation text-xl"></i>
	<div class="flex-1 w-full">
		<p>{m.chunkLoadErrorMessage()}</p>
		<button class="btn btn-ghost btn-xs mt-1" onclick={() => (expanded = !expanded)}>
			{m.chunkLoadErrorDetails()}
			<i class="fa-solid fa-chevron-{expanded ? 'up' : 'down'} ml-1"></i>
		</button>
		{#if expanded}
			<pre
				class="bg-base-300 text-base-content mt-2 overflow-x-auto rounded p-2 text-xs w-full">{error}</pre>
		{/if}
	</div>
	<button class="btn btn-error btn-sm" onclick={() => location.reload()}>
		<i class="fa-solid fa-rotate-right"></i>
		{m.chunkLoadErrorReload()}
	</button>
</div>
