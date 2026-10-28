<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';

	interface Props {
		error: unknown;
	}

	let { error }: Props = $props();
	let expanded = $state(false);
</script>

<div class="alert alert-error alert-soft">
	<i class="fa-sharp-duotone fa-solid fa-triangle-exclamation text-xl"></i>
	<div class="collapse {expanded ? 'collapse-open' : ''} flex-1 w-full">
		<div>
			<p>{m.chunkLoadErrorMessage()}</p>
			<button class="btn btn-ghost btn-xs mt-1" onclick={() => (expanded = !expanded)}>
				{m.chunkLoadErrorDetails()}
				<i
					class="fa-sharp-duotone fa-solid fa-chevron-down ml-1 transition-transform duration-200 {expanded
						? 'rotate-180'
						: ''}"
				></i>
			</button>
		</div>
		<div class="collapse-content px-0 pb-0">
			<pre
				class="bg-base-300 text-base-content mt-2 overflow-x-auto rounded-field p-2 text-xs w-full">{error}</pre>
		</div>
	</div>
	<button class="btn btn-error btn-sm" onclick={() => location.reload()}>
		<i class="fa-sharp-duotone fa-solid fa-rotate-right"></i>
		{m.chunkLoadErrorReload()}
	</button>
</div>
