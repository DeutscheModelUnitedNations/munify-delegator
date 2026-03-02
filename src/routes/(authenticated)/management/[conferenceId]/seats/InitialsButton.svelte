<script lang="ts">
	import formatNames, { formatInitials } from '$lib/services/formatNames';
	import { openUserCard } from '$lib/components/UserCard/userCardState.svelte';

	interface Props {
		given_name: string;
		family_name: string;
		userId: string;
		conferenceId: string;
	}

	let { given_name, family_name, userId, conferenceId }: Props = $props();
</script>

<div class="tooltip" data-tip={formatNames(given_name, family_name)}>
	<button class="btn btn-sm w-10 font-mono" onclick={() => openUserCard(userId, conferenceId)}>
		{formatInitials(given_name, family_name)}
	</button>
</div>
