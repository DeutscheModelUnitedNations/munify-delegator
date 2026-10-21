<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { openUserCard } from '#lib/components/userCard/userCardState.svelte.js';

	interface Props {
		userId: string;
	}

	let { userId }: Props = $props();
</script>

<button
	class="btn btn-ghost btn-sm btn-square"
	onclick={() => openUserCard(userId)}
	aria-label={m.details()}
>
	<i class="fa-sharp-duotone fa-solid fa-id-card"></i>
</button>
