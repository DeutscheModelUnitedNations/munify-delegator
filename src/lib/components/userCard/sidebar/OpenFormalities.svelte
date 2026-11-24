<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { formalitiesOf, isOpen, needsGuardian } from '../formalities';
	import { fetchStatusWithAge } from '../tabs/participantStatus';
	import { FORMALITY_META } from '../sections/formalityOptions';
	import OpenFormality from './OpenFormality.svelte';

	/**
	 * What the person still has to settle, each opening the tab where it is changed. What is done is
	 * folded behind a count. Nothing without a participant row.
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
	const formalities = $derived(
		formalitiesOf({
			status,
			needsGuardian: needsGuardian({
				isConferenceSupervisor,
				birthday: data.user.birthday,
				startConference: data.conference.startConference
			})
		})
	);
	const open = $derived(formalities.filter(isOpen));
	const done = $derived(formalities.filter((formality) => !isOpen(formality)));
</script>

{#if status}
	<div class="flex flex-col gap-1 text-sm" data-tour="team.userCard.status">
		{#if open.length > 0}
			<p class="text-warning font-bold">{m.userCardOpenCount({ count: open.length })}</p>
			<ul class="flex flex-col">
				{#each open as formality (formality.key)}
					<li>
						<OpenFormality {formality} onclick={onOpenTab} />
					</li>
				{/each}
			</ul>
			{#if done.length > 0}
				<details class="text-base-content/60">
					<summary class="cursor-pointer">{m.userCardDoneCount({ count: done.length })}</summary>
					<ul class="pl-4">
						{#each done as formality (formality.key)}
							<li>{FORMALITY_META[formality.key].title()}</li>
						{/each}
					</ul>
				</details>
			{/if}
		{:else}
			<p class="text-success">
				<i aria-hidden="true" class="ph-duotone ph-check-circle"></i>
				{m.userCardFormalitiesDone()}
			</p>
		{/if}
	</div>
{/if}
