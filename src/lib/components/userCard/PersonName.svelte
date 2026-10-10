<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	interface Props {
		givenName?: string | null;
		familyName?: string | null;
		/** Adds the head-delegate badge after the name. */
		isHeadDelegate?: boolean;
	}

	let { givenName, familyName, isHeadDelegate = false }: Props = $props();
</script>

<span class="capitalize">{givenName}</span>
<span class="uppercase">{familyName}</span>
{#if isHeadDelegate}
	<span class="badge badge-accent badge-xs ml-1"
		><i class="fa-sharp-duotone fa-solid fa-medal"></i>
		{m.headDelegate()}</span
	>
{/if}
