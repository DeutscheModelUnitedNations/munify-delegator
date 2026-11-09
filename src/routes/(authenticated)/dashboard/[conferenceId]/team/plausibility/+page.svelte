<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import { openUserCard } from '#lib/components/userCard/userCardState.svelte.js';
	import formatNames from '#lib/helpers/formatNames';
	import { ageBands, DUPLICATE_THRESHOLD } from '#lib/helpers/plausibilityRules';
	import { ageLimitsText } from '#lib/helpers/ageRangeText';
	import PlausibilityCheck from './PlausibilityCheck.svelte';
	import PossibleDuplicates from './PossibleDuplicates.svelte';
	import { duplicatesOfConference } from './possibleDuplicatesWhere';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
	const conferenceId = $derived(params.conferenceId);

	const userSummary = { id: true, givenName: true, familyName: true } as const;
	const accountName = { givenName: true, familyName: true } as const;

	const [plausibility, duplicates, limits] = $derived(
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
			}),
			client.liveQuery.conference({
				__args: { id: conferenceId },
				participantMinAge: true,
				participantMaxAge: true,
				supervisorMinAge: true
			})
		])
	);
	const ageLimits = $derived({
		participantMinAge: limits.participantMinAge ?? null,
		participantMaxAge: limits.participantMaxAge ?? null,
		supervisorMinAge: limits.supervisorMinAge ?? null
	});
	const limitsText = $derived(ageLimitsText(ageLimits));
	const bands = $derived(ageBands(ageLimits));

	const people = (users: { id: string; givenName: string | null; familyName: string | null }[]) =>
		users.map((user) => ({
			id: user.id,
			label: formatNames({
				givenName: user.givenName ?? undefined,
				familyName: user.familyName ?? undefined
			})
		}));

	/**
	 * Each check with the rule the API applied (`conferencePlausibility`) and who it found; an age
	 * check the conference's limits switch off (or make impossible) is left out.
	 */
	const userChecks = $derived(
		[
			bands.tooYoung?.lt !== undefined && {
				headline: m.plausibilityTooYoung(),
				rule: m.plausibilityRuleTooYoung({ age: bands.tooYoung.lt }),
				entries: people(plausibility.tooYoungUsers)
			},
			bands.tooOld?.gte !== undefined &&
				bands.tooOld.lt !== undefined && {
					headline: m.plausibilityTooOld(),
					rule: m.plausibilityRuleTooOld({
						max: bands.tooOld.gte - 1,
						supervisorMin: bands.tooOld.lt
					}),
					entries: people(plausibility.tooOldUsers)
				},
			bands.shouldBeSupervisor?.gte !== undefined && {
				headline: m.plausibilityShouldBeSupervisor(),
				rule: m.plausibilityRuleShouldBeSupervisor({ age: bands.shouldBeSupervisor.gte }),
				entries: people(plausibility.shouldBeSupervisor)
			},
			bands.shouldNotBeSupervisor?.lt !== undefined && {
				headline: m.plausibilityShouldNotBeSupervisor(),
				rule: m.plausibilityRuleShouldNotBeSupervisor({ age: bands.shouldNotBeSupervisor.lt }),
				entries: people(plausibility.shouldNotBeSupervisor)
			},
			{
				headline: m.plausibilityIncompleteOrInvalidData(),
				rule: m.plausibilityRuleIncompleteData(),
				entries: people(plausibility.dataMissing)
			}
		].filter((check) => check !== false)
	);

	const duplicateEntries = $derived(
		duplicates
			.filter((pair) => pair.status === 'OPEN')
			.map((pair) => ({
				id: pair.id,
				label: `${formatNames({ givenName: pair.user.givenName, familyName: pair.user.familyName })} ↔ ${formatNames({ givenName: pair.candidate.givenName, familyName: pair.candidate.familyName })}`
			}))
	);

	/** A pair is decided further down, so its entry leads to the pair. */
	const showPair = (id: string) =>
		document.getElementById(`pair-${id}`)?.scrollIntoView({ behavior: 'smooth' });
</script>

<div class="flex flex-col gap-6 py-4 sm:p-6">
	<p class="text-base-content/70 text-sm">
		<i aria-hidden="true" class="ph-duotone ph-cake mr-1"></i>
		{limitsText ? m.plausibilityAgeLimits({ limits: limitsText }) : m.plausibilityAgeLimitsOff()}
	</p>
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
