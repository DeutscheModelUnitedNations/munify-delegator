<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import StarRating from '$lib/components/StarRating.svelte';
	import codenamize from '$lib/helpers/codenamize';
	import formatNames from '$lib/helpers/formatNames';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import type { SingleParticipant } from './appData.svelte';
	import LoadingData from './components/LoadingData.svelte';
	import { getWeights } from './weights.svelte';

	interface Props {
		application: SingleParticipant;
	}

	let { application }: Props = $props();

	/** The card only receives ids; these are the details it needs to render. */
	async function fetchDetails(applicationId: string, supervisorIds: string[], userId: string) {
		const [singleParticipant, supervisors, user] = await Promise.all([
			client.query.singleParticipant({
				__args: { id: applicationId },
				id: true,
				school: true,
				experience: true,
				motivation: true
			}),
			// An empty `in` list would compile to invalid SQL.
			supervisorIds.length > 0
				? client.query.conferenceSupervisors({
						__args: { where: { id: { in: supervisorIds } } },
						user: { id: true, givenName: true, familyName: true }
					})
				: [],
			client.query.user({
				__args: { id: userId },
				id: true,
				givenName: true,
				familyName: true,
				gender: true,
				birthday: true,
				globalNotes: true,
				conferenceParticipationsCount: true
			})
		]);

		return { singleParticipant, supervisors, user };
	}

	let details = $state<Awaited<ReturnType<typeof fetchDetails>>>();
	let detailsLoading = $state(false);
	let detailsFailed = $state(false);

	let applicationDetails = $derived(details?.singleParticipant);
	let supervisorDetails = $derived(details?.supervisors ?? []);
	let userDetails = $derived(details?.user);

	$effect(() => {
		if (!application.id) return;
		detailsLoading = true;
		detailsFailed = false;
		void fetchDetails(
			application.id,
			application.supervisors?.map((sp) => sp.id) ?? [],
			application.user.id
		)
			.then((result) => {
				details = result;
			})
			.catch(() => {
				detailsFailed = true;
			})
			.finally(() => {
				detailsLoading = false;
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
		<LoadingData fetching={detailsLoading} error={detailsFailed}>
			{formatNames(userDetails?.givenName ?? undefined, userDetails?.familyName ?? undefined)}
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
		<LoadingData fetching={detailsLoading} error={detailsFailed}>
			<div class="tooltip" data-tip={applicationDetails?.school}>
				<i class="fas fa-school"></i>
			</div>
		</LoadingData>
		{#if supervisorDetails?.length > 0}
			<LoadingData fetching={detailsLoading} error={detailsFailed}>
				<div
					class="tooltip"
					data-tip={supervisorDetails
						.map((x) => formatNames(x.user.givenName ?? undefined, x.user.familyName ?? undefined))
						.join(', ')}
				>
					<i class="fas fa-chalkboard-user"></i>
				</div>
			</LoadingData>
		{/if}
	</div>
</div>
