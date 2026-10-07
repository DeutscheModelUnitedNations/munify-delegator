<script lang="ts">
	import formatNames, { formatInitials } from '$lib/helpers/formatNames';
	import { openUserCard } from '$lib/components/userCard/userCardState.svelte';

	interface Props {
		given_name: string;
		family_name: string;
		userId: string;
	}

	let { given_name, family_name, userId }: Props = $props();
</script>

<div class="tooltip" data-tip={formatNames(given_name, family_name)}>
	<button class="btn btn-sm w-10 font-mono" onclick={() => openUserCard(userId)}>
		{formatInitials(given_name, family_name)}
	</button>
</div>
