<script lang="ts">
	import { graphql } from '$houdini';
	import { onMount } from 'svelte';
	import LoadingData from '../components/LoadingData.svelte';

	interface Props {
		userIds: string[];
	}

	let { userIds }: Props = $props();

	const getApplicationUserDetailsQuery = graphql(`
		query GetApplicationUserDetails($userIds: [String!]) {
			findManyUsers(where: { id: { in: $userIds } }) {
				id
				given_name
				family_name
				gender
				birthday
				globalNotes
			}
		}
	`);

	$effect(() => {
		if (userIds.length === 0) return;
		getApplicationUserDetailsQuery.fetch({
			variables: {
				userIds: userIds
			}
		});
	});
</script>

<tr>
	<td class="text-center"><i class="fa-duotone fa-users text-lg"></i></td>
	<td>
		<LoadingData
			fetching={$getApplicationUserDetailsQuery.fetching}
			error={$getApplicationUserDetailsQuery.data?.fioundManyUsers.length != 0}
		>
			{#each $getApplicationUserDetailsQuery.data?.findManyUsers ?? [] as user (user.id)}
				Test
			{/each}
		</LoadingData>
	</td>
</tr>
