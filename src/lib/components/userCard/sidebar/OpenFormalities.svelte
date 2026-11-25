<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { isOpen } from '../formalities';
	import { fetchStatusWithAge, personFormalities } from '../tabs/participantStatus';
	import OpenFormality from './OpenFormality.svelte';

	/**
	 * How many of the formalities are settled, and the open ones, each opening the tab where it is
	 * changed. Nothing once all are settled (the tab says so) or without a participant row.
	 */
	interface Props {
		userId: string;
		conferenceId: string;
		isConferenceSupervisor: boolean;
		onOpenTab: () => void;
	}

	let { userId, conferenceId, isConferenceSupervisor, onOpenTab }: Props = $props();

	// The same row the formalities tab reads, so both share one cache record.
	const data = $derived(await fetchStatusWithAge({ userId, conferenceId }));
	const status = $derived(data.statuses.at(0));
	const formalities = $derived(personFormalities({ data, isConferenceSupervisor }));
	const open = $derived(formalities.filter(isOpen));
	const done = $derived(formalities.length - open.length);
	const doneOf = $derived(m.userCardDoneOf({ count: done, total: formalities.length }));
</script>

{#if status && open.length > 0}
	<div
		class="border-base-content/10 flex flex-col gap-2 border-t pt-3"
		data-tour="team.userCard.status"
	>
		<p class="flex items-center justify-between gap-2 text-sm">
			<span class="flex items-center gap-2 font-bold">
				<i aria-hidden="true" class="ph-duotone ph-list-checks text-warning text-lg"></i>
				{m.userCardTabFormalities()}
			</span>
			<span class="text-base-content/70">{doneOf}</span>
		</p>
		<progress
			class="progress progress-warning"
			value={done}
			max={formalities.length}
			aria-label={doneOf}
		></progress>
		<ul class="flex flex-col gap-1">
			{#each open as formality (formality.key)}
				<li><OpenFormality {formality} onclick={onOpenTab} /></li>
			{/each}
		</ul>
	</div>
{/if}
