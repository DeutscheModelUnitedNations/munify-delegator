<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { client } from '#lib/api/rumbleClient/client.js';
	import QuotedText from '../QuotedText.svelte';
	import InfoRow from './InfoRow.svelte';

	/**
	 * The person's waiting list entry: since when they wait, whether they got a seat from it, and
	 * what they wrote. Nothing when they never were on the list.
	 */
	interface Props {
		userId: string;
		conferenceId: string;
	}

	let { userId, conferenceId }: Props = $props();

	const entries = $derived(
		await client.liveQuery.waitingListEntries({
			__args: { where: { conferenceId: { eq: conferenceId }, userId: { eq: userId } } },
			id: true,
			createdAt: true,
			assigned: true,
			assignedAt: true,
			hidden: true,
			motivation: true,
			experience: true,
			requests: true,
			school: { id: true, name: true }
		})
	);
	const entry = $derived(entries.at(0));

	const formatDate = (date: Date) => date.toLocaleDateString(getLocale(), { dateStyle: 'medium' });
</script>

{#if entry}
	<section class="flex flex-col gap-3">
		<div class="flex flex-wrap items-center gap-3">
			<h3 class="text-lg font-bold">{m.waitingList()}</h3>
			{#if entry.assigned}
				<span class="badge badge-success badge-sm">{m.userCardSeatedFromWaitingList()}</span>
			{/if}
			{#if entry.hidden}
				<span class="badge badge-ghost badge-sm">{m.userCardWaitingListHidden()}</span>
			{/if}
		</div>
		<div class="bg-base-200 rounded-box divide-base-300 flex flex-col divide-y">
			<InfoRow title={m.waitingListSince()} faIcon="hourglass-half">
				<span class="text-sm">{formatDate(entry.createdAt)}</span>
			</InfoRow>
			{#if entry.assignedAt}
				<InfoRow title={m.userCardSeatedAt()} faIcon="chair">
					<span class="text-sm">{formatDate(entry.assignedAt)}</span>
				</InfoRow>
			{/if}
			<InfoRow title={m.schoolOrInstitution()} faIcon="school">
				<span class="text-sm">{entry.school?.name ?? m.noSchoolGiven()}</span>
			</InfoRow>
		</div>
		<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
			<QuotedText title={m.motivation()} text={entry.motivation} />
			<QuotedText title={m.experience()} text={entry.experience} />
			{#if entry.requests}
				<QuotedText
					class="md:col-span-2"
					title={m.userCardWaitingListRequests()}
					text={entry.requests}
				/>
			{/if}
		</div>
	</section>
{/if}
