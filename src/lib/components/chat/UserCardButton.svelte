<!--
	@component
	Opens the user card of a person of a chat: for participant care, who know the people by name.
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { openUserCard } from '#lib/components/userCard/userCardState.svelte.js';

	interface Props {
		userId: string;
		name: string;
	}

	let { userId, name }: Props = $props();
</script>

<button
	type="button"
	class="btn btn-ghost btn-sm btn-square"
	title={m.chatOpenUserCard({ name })}
	aria-label={m.chatOpenUserCard({ name })}
	onclick={() => openUserCard(userId)}
>
	<i aria-hidden="true" class="ph-duotone ph-identification-card text-lg"></i>
</button>
