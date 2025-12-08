<script lang="ts">
	import { graphql } from '$houdini';
	import { onMount } from 'svelte';
	import LoadingData from '../components/LoadingData.svelte';
	import formatNames from '$lib/services/formatNames';
	import { getAgeAtConference } from '$lib/services/ageChecker';

	interface Props {
		userIds: string[];
		startConference: Date;
	}

	let { userIds, startConference }: Props = $props();

	const getApplicationUserDetailsQuery = graphql(`
		query GetApplicationUserDetails($userIds: [String!]) {
			findManyUsers(where: { id: { in: $userIds } }) {
				id
				given_name
				family_name
				gender
				birthday
				globalNotes
				conferenceParticipationsCount
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
			error={!$getApplicationUserDetailsQuery.data?.findManyUsers}
		>
			<ul class="flex list-inside list-disc flex-col justify-center gap-1">
				{#each $getApplicationUserDetailsQuery.data?.findManyUsers ?? [] as user (user.id)}
					<li>
						{formatNames(user.given_name, user.family_name)}
						<span class="badge badge-xs badge-neutral">
							{getAgeAtConference(user.birthday, startConference) ?? '?'}
						</span>
						<span
							class="badge badge-xs {user.gender === 'FEMALE'
								? 'bg-pink-600'
								: user.gender === 'MALE'
									? 'bg-blue-500'
									: 'bg-gray-500'}"
						>
							<i
								class="fa-solid fa-{user.gender === 'FEMALE'
									? 'venus'
									: user.gender === 'MALE'
										? 'mars'
										: 'venus-mars'}"
							></i>
						</span>
						{#if user.conferenceParticipationsCount > 0}
							<span class="badge badge-xs badge-warning">
								<i class="fa-solid fa-rotate-left"></i>
								{user.conferenceParticipationsCount}</span
							>
						{/if}
					</li>
				{/each}
			</ul>
		</LoadingData>
	</td>
</tr>
