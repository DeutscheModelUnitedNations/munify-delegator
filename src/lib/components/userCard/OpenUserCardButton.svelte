<script lang="ts">
	import formatNames from '#lib/helpers/formatNames';
	import { openUserCard } from './userCardState.svelte';

	interface Props {
		user: { id: string; givenName?: string | null; familyName?: string | null };
	}

	let { user }: Props = $props();
</script>

<button
	class="btn btn-ghost btn-xs btn-square"
	onclick={() => openUserCard(user.id)}
	title={formatNames({
		givenName: user.givenName ?? undefined,
		familyName: user.familyName ?? undefined,
		options: {
			givenNameFirst: true
		}
	})}
>
	<i class="fa-sharp-duotone fa-solid fa-id-card"></i>
</button>
