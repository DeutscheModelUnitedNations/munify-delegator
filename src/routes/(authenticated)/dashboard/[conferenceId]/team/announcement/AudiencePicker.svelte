<!--
	@component
	Picks who an announcement is for: any number of blocks, and whoever is in one of them reads it.
	Below the chips it says how many people that is right now.
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import { translateTeamRole } from '#lib/utils/enumTranslations';
	import {
		audienceInput,
		audienceKey,
		normalizeAudiences,
		TEAM_ROLES,
		type Audience
	} from '#lib/helpers/announcements';
	import {
		audienceKindLabel,
		audienceLabel,
		SIMPLE_AUDIENCES,
		type AudienceLookups
	} from './announcementLabels';

	interface Props {
		conferenceId: string;
		audiences: Audience[];
		lookups: AudienceLookups;
	}

	let { conferenceId, audiences = $bindable(), lookups }: Props = $props();

	const taken = $derived(new Set(audiences.map(audienceKey)));

	function add(audience: Audience) {
		audiences = normalizeAudiences([...audiences, audience]);
	}

	function remove(audience: Audience) {
		audiences = audiences.filter((other) => audienceKey(other) !== audienceKey(audience));
	}

	/** A select that adds what is picked and goes back to its placeholder. */
	function picked(
		event: Event & { currentTarget: HTMLSelectElement },
		build: (value: string) => Audience
	) {
		const { value } = event.currentTarget;
		event.currentTarget.value = '';
		if (value) add(build(value));
	}

	const isSimple = (value: string): value is (typeof SIMPLE_AUDIENCES)[number] =>
		SIMPLE_AUDIENCES.some((kind) => kind === value);
	const isTeamRole = (value: string): value is (typeof TEAM_ROLES)[number] =>
		TEAM_ROLES.some((role) => role === value);

	// the blocks are replaced as a whole on every change, so this asks again only then
	const counts = $derived(
		audiences.length === 0
			? undefined
			: await client.query.announcementAudiencePreview({
					__args: { conferenceId, audiences: audiences.map(audienceInput) },
					total: true,
					delegates: true,
					singleParticipants: true,
					supervisors: true,
					waitingList: true,
					team: true
				})
	);

	const breakdown = $derived(
		counts
			? [
					{ label: m.announcementAudienceDelegates(), count: counts.delegates },
					{ label: m.announcementAudienceSingleParticipants(), count: counts.singleParticipants },
					{ label: m.announcementAudienceSupervisors(), count: counts.supervisors },
					{ label: m.announcementAudienceWaitingList(), count: counts.waitingList },
					{ label: m.announcementAudienceTeam(), count: counts.team }
				].filter((part) => part.count > 0)
			: []
	);

	const options = (entries: ReadonlyMap<string, string>, kind: Audience['kind']) =>
		[...entries].filter(([id]) => !taken.has(`${kind}:${id}`));
</script>

<div class="flex flex-col gap-3" data-testid="audience-picker">
	{#if audiences.length > 0}
		<ul class="flex flex-wrap gap-2" aria-label={m.announcementAudience()}>
			{#each audiences as audience (audienceKey(audience))}
				<li class="badge badge-primary badge-soft gap-1 py-3">
					{audienceLabel({ audience, lookups })}
					<button
						type="button"
						class="cursor-pointer"
						aria-label={m.announcementAudienceRemove({
							audience: audienceLabel({ audience, lookups })
						})}
						onclick={() => remove(audience)}
					>
						<i aria-hidden="true" class="ph-duotone ph-x"></i>
					</button>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="text-warning-content bg-warning/20 rounded-field px-3 py-2 text-sm">
			{m.announcementAudienceRequired()}
		</p>
	{/if}

	<div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
		<select
			class="select select-sm w-full"
			aria-label={m.announcementAudienceAddGroup()}
			data-testid="audience-add-group"
			onchange={(event) =>
				picked(event, (value) => ({ kind: isSimple(value) ? value : 'EVERYONE' }))}
		>
			<option value="">{m.announcementAudienceAddGroup()}</option>
			{#each SIMPLE_AUDIENCES.filter((kind) => !taken.has(kind)) as kind (kind)}
				<option value={kind}>{audienceKindLabel(kind)}</option>
			{/each}
		</select>

		{#if lookups.committees.size > 0}
			<select
				class="select select-sm w-full"
				aria-label={m.announcementAudienceAddCommittee()}
				data-testid="audience-add-committee"
				onchange={(event) => picked(event, (committeeId) => ({ kind: 'COMMITTEE', committeeId }))}
			>
				<option value="">{m.announcementAudienceAddCommittee()}</option>
				{#each options(lookups.committees, 'COMMITTEE') as [id, name] (id)}
					<option value={id}>{name}</option>
				{/each}
			</select>
		{/if}

		{#if lookups.roles.size > 0}
			<select
				class="select select-sm w-full"
				aria-label={m.announcementAudienceAddRole()}
				onchange={(event) => picked(event, (roleId) => ({ kind: 'ROLE', roleId }))}
			>
				<option value="">{m.announcementAudienceAddRole()}</option>
				{#each options(lookups.roles, 'ROLE') as [id, name] (id)}
					<option value={id}>{name}</option>
				{/each}
			</select>
		{/if}

		{#if lookups.surveyOptions.size > 0}
			<select
				class="select select-sm w-full"
				aria-label={m.announcementAudienceAddSurveyOption()}
				onchange={(event) =>
					picked(event, (surveyOptionId) => ({ kind: 'SURVEY_OPTION', surveyOptionId }))}
			>
				<option value="">{m.announcementAudienceAddSurveyOption()}</option>
				{#each options(lookups.surveyOptions, 'SURVEY_OPTION') as [id, name] (id)}
					<option value={id}>{name}</option>
				{/each}
			</select>
		{/if}

		<select
			class="select select-sm w-full"
			aria-label={m.announcementAudienceAddTeam()}
			data-testid="audience-add-team"
			onchange={(event) =>
				picked(event, (value) => ({ kind: 'TEAM', teamRole: isTeamRole(value) ? value : null }))}
		>
			<option value="">{m.announcementAudienceAddTeam()}</option>
			{#if !taken.has('TEAM')}
				<option value="ALL">{m.announcementAudienceWholeTeam()}</option>
			{/if}
			{#each TEAM_ROLES.filter((role) => !taken.has(`TEAM:${role}`)) as role (role)}
				<option value={role}>{translateTeamRole(role)}</option>
			{/each}
		</select>
	</div>

	{#if counts}
		<p class="text-sm" data-testid="audience-count" aria-live="polite">
			<strong>{m.announcementAudienceReaches({ count: counts.total })}</strong>
			{#if breakdown.length > 0}
				<span class="text-base-content/70">
					({breakdown.map((part) => `${part.count} ${part.label}`).join(', ')})
				</span>
			{/if}
		</p>
	{/if}
	<p class="text-base-content/60 text-xs">{m.announcementAudienceHint()}</p>
</div>
