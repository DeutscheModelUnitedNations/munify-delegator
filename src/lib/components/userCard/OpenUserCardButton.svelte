<script lang="ts">
	import formatNames from '$lib/helpers/formatNames';
	import { openUserCard } from './userCardState.svelte';

	interface Props {
		user: { id: string; givenName?: string | null; familyName?: string | null };
	}

	let { user }: Props = $props();
</script>

<button
	class="btn btn-ghost btn-xs btn-square"
	onclick={() => openUserCard(user.id)}
	title={formatNames(user.givenName ?? undefined, user.familyName ?? undefined, {
		givenNameFirst: true
	})}
>
	<i class="fa-duotone fa-id-card"></i>
</button>
