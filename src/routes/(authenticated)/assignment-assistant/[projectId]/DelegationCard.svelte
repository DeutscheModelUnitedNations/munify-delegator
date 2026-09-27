<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import StarRating from '$lib/components/StarRating.svelte';
	import { getAgeAtConference } from '$lib/helpers/ageChecker';
	import codenamize from '$lib/helpers/codenamize';
	import formatNames from '$lib/helpers/formatNames';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import { getConference, type Delegation } from './appData.svelte';
	import LoadingData from './components/LoadingData.svelte';
	import { getWeights } from './weights.svelte';

	interface Props {
		application: Delegation;
	}

	let { application }: Props = $props();

	let optionsOpen = $state(false);

	/**
	 * The card only receives ids. An application id can name a delegation or a single
	 * participant, so both are looked up and whichever exists wins.
	 */
	async function fetchDetails(applicationId: string, supervisorIds: string[], userIds: string[]) {
		const [delegations, singleParticipants, supervisors, users] = await Promise.all([
			client.query.delegations({
				__args: { where: { id: { eq: applicationId } } },
				id: true,
				school: true,
				experience: true,
				motivation: true
			}),
			client.query.singleParticipants({
				__args: { where: { id: { eq: applicationId } } },
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
			userIds.length > 0
				? client.query.users({
						__args: { where: { id: { in: userIds } } },
						id: true,
						givenName: true,
						familyName: true,
						birthday: true,
						conferenceParticipationsCount: true
					})
				: []
		]);

		return {
			application: delegations.at(0) ?? singleParticipants.at(0),
			supervisors,
			users
		};
	}

	let details = $state<Awaited<ReturnType<typeof fetchDetails>>>();
	let detailsLoading = $state(false);
	let detailsFailed = $state(false);

	let applicationDetails = $derived(details?.application);
	let supervisorDetails = $derived(details?.supervisors ?? []);
	let userDetails = $derived(details?.users ?? []);

	$effect(() => {
		if (!application.id) return;
		detailsLoading = true;
		detailsFailed = false;
		void fetchDetails(
			application.id,
			application.members?.flatMap((m) => m.supervisors?.map((sp) => sp.id) ?? []) ?? [],
			application.members?.map((m) => m.user.id) ?? []
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

	let gotWishNation = $derived.by(() => {
		if (!application.assignedNation) return false;
		return application.appliedForRoles
			.map((x) => x.nation?.alpha3Code)
			.includes(application.assignedNation?.alpha3Code);
	});

	let gotWishNSA = $derived.by(() => {
		if (!application.assignedNSA) return false;
		return application.appliedForRoles
			.map((x) => x.nonStateActor?.id)
			.includes(application.assignedNSA?.id);
	});

	let gotWish = $derived.by(() => {
		if (!application.assignedNation && !application.assignedNSA) return true;
		return gotWishNation || gotWishNSA;
	});
</script>

<div
	role="none"
	class="flex grow-0 flex-col items-center gap-1 rounded-md p-2 {application.flagged
		? 'bg-warning'
		: application.note
			? `bg-info`
			: 'bg-base-300'} {!gotWish ? 'shadow-md shadow-red-500' : 'shadow'}"
>
	<p class="text-xs font-bold">
		{codenamize(application.id)}
	</p>
	<StarRating rating={application.evaluation ?? getWeights().nullRating} size="xs" />
	<div class="flex items-center justify-center gap-2 text-xs">
		<LoadingData fetching={detailsLoading} error={detailsFailed}>
			<div class="tooltip" data-tip="Durchschnittsalter">
				{(
					userDetails.reduce((acc, user) => {
						if (!user.birthday) return acc;
						const age = getAgeAtConference(
							user.birthday,
							getConference()?.startConference ?? new Date()
						);
						return acc + (age ? age : 0);
					}, 0) / (userDetails.length || 1)
				).toFixed(1)}
			</div>
		</LoadingData>
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
		{#if application.appliedForRoles.length > 0}
			<div
				class="tooltip"
				data-tip={application.appliedForRoles
					.map((x) =>
						x.nation?.alpha3Code
							? getFullTranslatedCountryNameFromISO3Code(x.nation?.alpha3Code ?? '')
							: x.nonStateActor?.abbreviation
					)
					.join(', ')}
			>
				<i class="fas fa-flag"></i>
			</div>
		{/if}
		<LoadingData fetching={detailsLoading} error={detailsFailed}>
			<div
				class="tooltip"
				data-tip={userDetails
					.map((x) => formatNames(x.givenName ?? undefined, x.familyName ?? undefined))
					.join(', ')}
			>
				<i class="fas fa-users"></i>
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
		{#if application.splittedFrom}
			<div class="tooltip" data-tip={`Zerteilt von ${codenamize(application.splittedFrom)}`}>
				<i class="fas fa-split"></i>
			</div>
		{/if}
		<LoadingData fetching={detailsLoading} error={detailsFailed}>
			<div class="tooltip" data-tip="Durchschnittliche Konferenzteilnahmen">
				{(
					userDetails.reduce((acc, user) => {
						return acc + (user.conferenceParticipationsCount ?? 0);
					}, 0) / (userDetails.length || 1)
				).toFixed(1)}
			</div>
		</LoadingData>
	</div>
</div>

<dialog class="modal {optionsOpen && 'modal-open'}">
	<div class="modal-box"></div>
</dialog>
