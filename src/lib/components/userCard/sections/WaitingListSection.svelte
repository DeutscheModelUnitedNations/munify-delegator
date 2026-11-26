<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import { client } from '#lib/api/rumbleClient/client';
	import QuotedText from '../QuotedText.svelte';
	import Section from '../ui/Section.svelte';
	import Row from '../ui/Row.svelte';

	/**
	 * The person's waiting list entry: since when they wait, whether they got a seat from it, and
	 * what they wrote, with the way to a seat while they still wait. Nothing when they never were
	 * on the list. Only participant care reads the entry, the same roles the seats page wants.
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
	<Section icon="clock-countdown" title={m.waitingList()} columns>
		{#snippet actions()}
			{#if entry.assignedAt}
				<span class="badge badge-soft badge-success">{m.userCardSeatedFromWaitingList()}</span>
			{/if}
			{#if entry.hidden}
				<span class="badge badge-ghost">{m.userCardWaitingListHidden()}</span>
			{/if}
			{#if !entry.assignedAt}
				<a
					class="btn btn-primary btn-sm"
					href={resolve(`dashboard/${conferenceId}/team/seats?assignUserId=${userId}`)}
				>
					<i aria-hidden="true" class="ph-duotone ph-user-plus text-lg"></i>
					{m.assignSeat()}
				</a>
			{/if}
		{/snippet}
		<div class="min-w-0">
			<Row icon="hourglass-medium" title={m.waitingListSince()}>
				{formatDate(entry.createdAt)}
			</Row>
			{#if entry.assignedAt}
				<Row icon="chair" title={m.userCardSeatedAt()}>{formatDate(entry.assignedAt)}</Row>
			{/if}
			<Row icon="graduation-cap" title={m.schoolOrInstitution()}>
				{entry.school?.name ?? m.noSchoolGiven()}
			</Row>
		</div>
		<div class="min-w-0">
			<QuotedText icon="chat-centered-text" title={m.motivation()} text={entry.motivation} />
			<QuotedText icon="trophy" title={m.experience()} text={entry.experience} />
			{#if entry.requests}
				<QuotedText icon="heart" title={m.userCardWaitingListRequests()} text={entry.requests} />
			{/if}
		</div>
	</Section>
{/if}
