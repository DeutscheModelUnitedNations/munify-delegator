<script lang="ts">
	import { openUserCard } from '$lib/components/userCard/userCardState.svelte';

	interface Props {
		userId: string;
		conferenceId: string;
	}

	let { userId, conferenceId }: Props = $props();
</script>

<button
	class="btn btn-ghost btn-sm btn-square"
	onclick={() => openUserCard(userId, conferenceId)}
	aria-label="Details"
>
	<i class="fa-duotone fa-id-card"></i>
</button>
