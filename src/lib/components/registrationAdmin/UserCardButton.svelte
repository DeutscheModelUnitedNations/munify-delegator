<script lang="ts">
	import { openUserCard } from '$lib/components/userCard/userCardState.svelte';

	interface Props {
		userId: string;
	}

	let { userId }: Props = $props();
</script>

<button
	class="btn btn-ghost btn-sm btn-square"
	onclick={() => openUserCard(userId)}
	aria-label="Details"
>
	<i class="fa-sharp-duotone fa-solid fa-id-card"></i>
</button>
