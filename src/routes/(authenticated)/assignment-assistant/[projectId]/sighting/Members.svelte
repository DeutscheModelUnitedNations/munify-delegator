<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { onMount } from 'svelte';
	import LoadingData from '../components/LoadingData.svelte';
	import formatNames from '$lib/helpers/formatNames';
	import { getAgeAtConference } from '$lib/helpers/ageChecker';

	interface Props {
		userIds: string[];
		startConference: Date;
	}

	let { userIds, startConference }: Props = $props();

	function fetchUsers(ids: string[]) {
		return client.query.users({
			__args: { where: { id: { in: ids } } },
			id: true,
			givenName: true,
			familyName: true,
			gender: true,
			birthday: true,
			globalNotes: true,
			conferenceParticipationsCount: true
		});
	}

	let users = $state<Awaited<ReturnType<typeof fetchUsers>>>();
	let usersLoading = $state(false);

	$effect(() => {
		if (userIds.length === 0) return;
		usersLoading = true;
		void fetchUsers(userIds)
			.then((result) => {
				users = result;
			})
			.finally(() => {
				usersLoading = false;
			});
	});
</script>

<tr>
	<td class="text-center"><i class="fa-duotone fa-users text-lg"></i></td>
	<td>
		<LoadingData fetching={usersLoading} error={!users}>
			<ul class="flex list-inside list-disc flex-col justify-center gap-1">
				{#each users ?? [] as user (user.id)}
					<li>
						{formatNames(user.givenName ?? undefined, user.familyName ?? undefined)}
						<span class="badge badge-xs badge-neutral">
							{(user.birthday && getAgeAtConference(user.birthday, startConference)) ?? '?'}
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
