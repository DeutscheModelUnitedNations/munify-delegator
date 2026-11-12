<!--
	@component
	Publishing an announcement: right away or at a time, with how many people it reaches and
	whether they are mailed, before anything goes out.
-->
<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import Modal from '#lib/components/Modal.svelte';
	import { datetimeLocalToDate } from '#lib/helpers/conferenceTimezoneDate';
	import { genericPromiseToastMessages } from '#lib/utils/toast';

	interface Props {
		open: boolean;
		announcement: { id: string; title: string; recipientCount: number; notifyByMail: boolean };
		timezone: string;
	}

	let { open = $bindable(), announcement, timezone }: Props = $props();

	let when = $state<'now' | 'later'>('now');
	let at = $state('');
	let busy = $state(false);

	const publishAt = $derived(
		when === 'later' && at ? datetimeLocalToDate({ datetimeLocal: at, timezone }) : undefined
	);
	const ready = $derived(when === 'now' || (!!publishAt && publishAt.getTime() > Date.now()));

	async function publish() {
		busy = true;
		try {
			const promise = client.mutate.publishAnnouncement({
				__args: { id: announcement.id, publishAt },
				id: true,
				state: true
			});
			toast.promise(promise, genericPromiseToastMessages);
			await promise;
			open = false;
		} finally {
			busy = false;
		}
	}
</script>

<Modal bind:open title={m.announcementPublishTitle()}>
	<div class="flex flex-col gap-4" data-testid="publish-dialog">
		<p class="font-semibold break-words">{announcement.title}</p>
		<p data-testid="publish-recipients">
			{m.announcementPublishReaches({ count: announcement.recipientCount })}
			{announcement.notifyByMail
				? m.announcementPublishWithMail()
				: m.announcementPublishWithoutMail()}
		</p>
		{#if announcement.recipientCount === 0}
			<div class="alert alert-warning">
				<i aria-hidden="true" class="ph-duotone ph-warning"></i>
				<span>{m.announcementPublishNobody()}</span>
			</div>
		{/if}
		<fieldset class="fieldset">
			<legend class="fieldset-legend">{m.announcementPublishWhen()}</legend>
			<label class="label cursor-pointer justify-start gap-3">
				<input type="radio" class="radio radio-sm" value="now" bind:group={when} />
				{m.announcementPublishNow()}
			</label>
			<label class="label cursor-pointer justify-start gap-3">
				<input type="radio" class="radio radio-sm" value="later" bind:group={when} />
				{m.announcementPublishLater()}
			</label>
			{#if when === 'later'}
				<input
					type="datetime-local"
					class="input w-full"
					aria-label={m.announcementPublishAt()}
					bind:value={at}
				/>
				<p class="text-base-content/60 text-xs">
					{m.announcementTimezoneHint({ timezone })}
				</p>
			{/if}
		</fieldset>
	</div>
	{#snippet action()}
		<button class="btn" onclick={() => (open = false)}>{m.cancel()}</button>
		<button
			class="btn btn-primary"
			disabled={!ready || busy}
			onclick={publish}
			data-testid="publish-confirm"
		>
			<i aria-hidden="true" class="ph-duotone ph-megaphone"></i>
			{when === 'now' ? m.announcementPublishNow() : m.announcementSchedule()}
		</button>
	{/snippet}
</Modal>
