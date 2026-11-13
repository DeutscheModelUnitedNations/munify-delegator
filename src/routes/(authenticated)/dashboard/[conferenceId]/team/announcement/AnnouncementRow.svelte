<!--
	@component
	One announcement in the team's list: its state, whom it is for, its facts and its buttons.
	What it shows is worked out in `announcementRowView`; the page runs the actions.
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import type { AnnouncementRow } from './announcementRows';
	import {
		audienceLabel,
		isAnnouncementState,
		STATE_LOOK,
		type AudienceLookups
	} from './announcementLabels';
	import { rowActions, rowBadges, rowFacts, type RowAction } from './announcementRowView';

	interface Props {
		row: AnnouncementRow;
		lookups: AudienceLookups;
		timezone: string;
		onAction: (action: RowAction) => void;
	}

	let { row, lookups, timezone, onAction }: Props = $props();

	const state = $derived(isAnnouncementState(row.state) ? row.state : 'DRAFT');
	const look = $derived(STATE_LOOK[state]);
	const dateTime = (value: Date | string) =>
		new Date(value).toLocaleString(getLocale(), {
			dateStyle: 'medium',
			timeStyle: 'short',
			timeZone: timezone
		});
	const badges = $derived(rowBadges(row));
	const facts = $derived(rowFacts({ row, state, dateTime }));
	const actions = $derived(rowActions({ row, state }));
</script>

<li
	class="bg-base-100 border-base-300 rounded-box flex flex-col gap-3 border p-4"
	data-testid="announcement-row"
	data-state={state}
>
	<div class="flex flex-wrap items-center gap-2">
		<h2 class="min-w-0 flex-1 text-lg font-semibold break-words">{row.title}</h2>
		<span class="badge {look.badge}" data-testid="announcement-state">{look.label()}</span>
		{#each badges as badge (badge.key)}
			<span class="badge {badge.look}">
				{#if badge.icon}<i aria-hidden="true" class={badge.icon}></i>{/if}
				{badge.label}
			</span>
		{/each}
	</div>

	<ul class="flex flex-wrap gap-1.5" aria-label={m.announcementAudience()}>
		{#each row.audiences as audience (audience.id)}
			<li class="badge badge-primary badge-soft badge-sm">
				{audienceLabel({ audience, lookups })}
			</li>
		{/each}
	</ul>

	<p class="text-base-content/70 flex flex-wrap gap-x-4 gap-y-1 text-sm">
		{#each facts as fact (fact.key)}
			<span data-testid="announcement-{fact.key}">{fact.text}</span>
		{/each}
	</p>

	<div class="flex flex-wrap gap-2">
		{#each actions as button (button.action)}
			<button
				class="btn btn-sm {button.look}"
				onclick={() => onAction(button.action)}
				data-testid="announcement-{button.action}"
			>
				<i aria-hidden="true" class="ph-duotone {button.icon}"></i>
				{button.label}
			</button>
		{/each}
	</div>
</li>
