<script lang="ts">
	import { graphql } from '$houdini';
	import StarRating from '$lib/components/StarRating.svelte';
	import codenamize from '$lib/services/codenamize';
	import formatNames from '$lib/services/formatNames';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import type { SingleParticipant } from './appData.svelte';
	import LoadingData from './components/LoadingData.svelte';
	import { getWeights } from './weights.svelte';

	interface Props {
		application: SingleParticipant;
	}

	let { application }: Props = $props();

	let applicationDetails = $derived.by<
		| {
				school?: string;
				experience?: string;
				motivation?: string;
		  }
		| undefined
	>(() => {
		const singleParticipant = $getApplicationDetailsQuery.data?.findUniqueSingleParticipant;

		return singleParticipant ?? undefined;
	});

	let supervisorDetails = $derived.by(() => {
		return $getApplicationDetailsQuery.data?.findManyConferenceSupervisors ?? [];
	});

	let userDetails = $derived.by(() => {
		return $getApplicationDetailsQuery.data?.findUniqueUser;
	});

	const getApplicationDetailsQuery = graphql(`
		query GetApplicationDetailsSingleApplication(
			$applicationId: String!
			$supervisorIds: [String!]
			$userId: String!
		) {
			findUniqueSingleParticipant(where: { id: $applicationId }) {
				id
				school
				experience
				motivation
			}

			findManyConferenceSupervisors(where: { id: { in: $supervisorIds } }) {
				user {
					id
					given_name
					family_name
				}
			}

			findUniqueUser(where: { id: $userId }) {
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
		if (!application.id) return;
		getApplicationDetailsQuery.fetch({
			variables: {
				applicationId: application.id,
				supervisorIds: application.supervisors?.map((sp) => sp.id) ?? [],
				userId: application.user.id
			}
		});
	});
</script>

<div
	role="none"
	class="flex grow-0 flex-col items-center gap-1 rounded-md p-2 {application.flagged
		? 'bg-warning'
		: application.note
			? `bg-info`
			: 'bg-base-300'} shadow"
>
	<p class="text-xs font-bold">
		<LoadingData
			fetching={$getApplicationDetailsQuery.fetching}
			error={$getApplicationDetailsQuery.error}
		>
			{formatNames(userDetails?.given_name, userDetails?.family_name)}
		</LoadingData>
	</p>
	<div class="flex items-center justify-center gap-2 text-base">
		{#each application.appliedForRoles as role}
			<div class="tooltip" data-tip={role.name}>
				<i class="fas fa-{role.fontAwesomeIcon?.replace('fa-', '')}"></i>
			</div>
		{/each}
	</div>
	<StarRating rating={application.evaluation ?? getWeights().nullRating} size="xs" />
	<div class="flex items-center justify-center gap-2 text-xs">
		{#if application.note}
			<div class="tooltip" data-tip={application.note}>
				<i class="fas fa-sticky-note"></i>
			</div>
		{/if}
		<div class="tooltip" data-tip={application.id}>
			<i class="fas fa-barcode-scan"></i>
		</div>
		<LoadingData
			fetching={$getApplicationDetailsQuery.fetching}
			error={$getApplicationDetailsQuery.error}
		>
			<div class="tooltip" data-tip={applicationDetails?.school}>
				<i class="fas fa-school"></i>
			</div>
		</LoadingData>
		{#if supervisorDetails?.length > 0}
			<LoadingData
				fetching={$getApplicationDetailsQuery.fetching}
				error={$getApplicationDetailsQuery.error}
			>
				<div
					class="tooltip"
					data-tip={supervisorDetails
						.map((x) => formatNames(x.user.given_name, x.user.family_name))
						.join(', ')}
				>
					<i class="fas fa-chalkboard-user"></i>
				</div>
			</LoadingData>
		{/if}
	</div>
</div>
