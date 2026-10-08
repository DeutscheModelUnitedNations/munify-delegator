<script lang="ts">
	import { openUserCard } from '$lib/components/userCard/userCardState.svelte';

	interface Props {
		userId: string;
	}

	let { userId }: Props = $props();
</script>

<button
	class="btn btn-ghost btn-xs btn-square print:hidden"
	aria-label="Open user card"
	onclick={(e) => {
		e.stopPropagation();
		openUserCard(userId);
	}}
>
	<i class="fa-sharp-duotone fa-solid fa-id-card"></i>
</button>
