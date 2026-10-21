<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { openUserCard } from '#lib/components/userCard/userCardState.svelte.js';

	interface Props {
		userId: string;
	}

	let { userId }: Props = $props();
</script>

<button
	class="btn btn-ghost btn-xs btn-square print:hidden"
	aria-label={m.a11yOpenUserCard()}
	onclick={(e) => {
		e.stopPropagation();
		openUserCard(userId);
	}}
>
	<i class="fa-sharp-duotone fa-solid fa-id-card"></i>
</button>
