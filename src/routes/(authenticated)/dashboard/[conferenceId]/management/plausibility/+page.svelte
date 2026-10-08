<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { client } from '$lib/api/rumbleClient/client';
	import { openUserCard } from '$lib/components/userCard/userCardState.svelte';
	import formatNames from '$lib/helpers/formatNames';
	import {
		DUPLICATE_THRESHOLD,
		PARTICIPANT_MAX_AGE,
		PARTICIPANT_MIN_AGE,
		SUPERVISOR_MIN_AGE,
		yearsAgo
	} from '$lib/helpers/plausibilityRules';
	import PlausibilityCheck from './PlausibilityCheck.svelte';
	import PossibleDuplicates from './PossibleDuplicates.svelte';
	import { duplicatesOfConference } from './possibleDuplicatesWhere';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
	const conferenceId = $derived(params.conferenceId);

	const userSummary = { id: true, givenName: true, familyName: true } as const;
	const accountName = { givenName: true, familyName: true } as const;

	const [plausibility, duplicates] = $derived(
		await Promise.all([
			client.liveQuery.conferencePlausibility({
				__args: { conferenceId },
				dataMissing: userSummary,
				shouldBeSupervisor: userSummary,
				shouldNotBeSupervisor: userSummary,
				tooOldUsers: userSummary,
				tooYoungUsers: userSummary
			}),
			client.liveQuery.possibleDuplicates({
				__args: { where: duplicatesOfConference(conferenceId) },
				id: true,
				status: true,
				user: accountName,
				candidate: accountName
			})
		])
	);

	const date = (yearsBack: number) => yearsAgo(yearsBack).toLocaleDateString();
	const people = (users: { id: string; givenName: string | null; familyName: string | null }[]) =>
		users.map((user) => ({
			id: user.id,
			label: formatNames(user.givenName ?? undefined, user.familyName ?? undefined)
		}));

	/** Each check with the rule the API applied (`conferencePlausibility`) and who it found. */
	const userChecks = $derived([
		{
			headline: m.plausibilityTooYoung(),
			rule: m.plausibilityRuleTooYoung({ date: date(PARTICIPANT_MIN_AGE) }),
			entries: people(plausibility.tooYoungUsers)
		},
		{
			headline: m.plausibilityTooOld(),
			rule: m.plausibilityRuleTooOld({
				from: date(PARTICIPANT_MAX_AGE),
				to: date(SUPERVISOR_MIN_AGE)
			}),
			entries: people(plausibility.tooOldUsers)
		},
		{
			headline: m.plausibilityShouldBeSupervisor(),
			rule: m.plausibilityRuleShouldBeSupervisor({ date: date(PARTICIPANT_MAX_AGE) }),
			entries: people(plausibility.shouldBeSupervisor)
		},
		{
			headline: m.plausibilityShouldNotBeSupervisor(),
			rule: m.plausibilityRuleShouldNotBeSupervisor({ date: date(SUPERVISOR_MIN_AGE) }),
			entries: people(plausibility.shouldNotBeSupervisor)
		},
		{
			headline: m.plausibilityIncompleteOrInvalidData(),
			rule: m.plausibilityRuleIncompleteData(),
			entries: people(plausibility.dataMissing)
		}
	]);

	const duplicateEntries = $derived(
		duplicates
			.filter((pair) => pair.status === 'OPEN')
			.map((pair) => ({
				id: pair.id,
				label: `${formatNames(pair.user.givenName, pair.user.familyName)} ↔ ${formatNames(pair.candidate.givenName, pair.candidate.familyName)}`
			}))
	);

	/** A pair is decided further down, so its entry leads to the pair. */
	const showPair = (id: string) =>
		document.getElementById(`pair-${id}`)?.scrollIntoView({ behavior: 'smooth' });
</script>

<div class="flex flex-col gap-6 p-6">
	<div class="grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-3">
		{#each userChecks as check (check.headline)}
			<PlausibilityCheck {...check} onSelect={openUserCard} />
		{/each}
		<PlausibilityCheck
			headline={m.plausibilityPossibleDuplicates()}
			rule={m.plausibilityRuleDuplicates({ score: Math.round(DUPLICATE_THRESHOLD * 100) })}
			entries={duplicateEntries}
			onSelect={showPair}
		/>
	</div>

	<PossibleDuplicates {conferenceId} />
</div>
