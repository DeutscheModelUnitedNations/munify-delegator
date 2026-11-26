<script lang="ts">
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import Modal from '#lib/components/Modal.svelte';
	import ActionModal from '#lib/components/ActionModal.svelte';
	import { googleCalendarSubscribeUrl, webcalUrl } from './calendarExport';

	/** The schedule's way into calendar apps: a one-time download and a subscription link. */
	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	const linkId = $props.id();
	let open = $state(false);
	let confirmReset = $state(false);
	let resetting = $state(false);
	let feedUrl = $state<string>();

	/** A scalar mutation answers its value, which the client types as subscribeable. */
	const asLink = (value: unknown) => (typeof value === 'string' ? value : undefined);

	async function openSubscription() {
		open = true;
		try {
			feedUrl ??= await Promise.resolve(
				client.mutate.calendarFeedUrl({ __args: { conferenceId } })
			).then(asLink);
		} catch (error) {
			open = false;
			toast.error(error instanceof Error ? error.message : String(error));
		}
	}

	async function copy() {
		if (!feedUrl) return;
		await navigator.clipboard.writeText(feedUrl);
		toast.success(m.linkCopied());
	}

	async function reset() {
		resetting = true;
		try {
			feedUrl = await Promise.resolve(
				client.mutate.resetCalendarFeedUrl({ __args: { conferenceId } })
			).then(asLink);
			toast.success(m.calendarExportResetDone());
			confirmReset = false;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : String(error));
		} finally {
			resetting = false;
		}
	}
</script>

<div class="flex flex-wrap gap-2">
	<button type="button" class="btn btn-sm btn-primary" onclick={openSubscription}>
		<i aria-hidden="true" class="ph-duotone ph-calendar-plus"></i>
		{m.calendarExportSubscribe()}
	</button>
	<a
		class="btn btn-sm btn-ghost"
		href={resolve('/(authenticated)/dashboard/[conferenceId]/calendar/calendar.ics', {
			conferenceId
		})}
		download
		title={m.calendarExportDownloadHint()}
	>
		<i aria-hidden="true" class="ph-duotone ph-download-simple"></i>
		{m.calendarExportDownload()}
	</a>
</div>

<Modal bind:open title={m.calendarExportTitle()}>
	<div class="flex flex-col gap-4">
		<p>{m.calendarExportExplanation()}</p>
		{#if feedUrl}
			<div class="flex flex-col gap-1">
				<label for={linkId} class="text-sm font-medium">{m.calendarExportLink()}</label>
				<div class="join w-full">
					<input
						id={linkId}
						type="text"
						class="input join-item flex-1 font-mono text-xs"
						value={feedUrl}
						readonly
						onfocus={(event) => event.currentTarget.select()}
					/>
					<button
						type="button"
						class="btn join-item"
						onclick={copy}
						aria-label={m.copy()}
						title={m.copy()}
					>
						<i aria-hidden="true" class="ph-duotone ph-copy"></i>
					</button>
				</div>
			</div>
			<div class="flex flex-wrap gap-2">
				<!-- eslint-disable svelte/no-navigation-without-resolve -- links into calendar apps -->
				<a class="btn btn-sm btn-primary" href={webcalUrl(feedUrl)}>
					<i aria-hidden="true" class="ph-duotone ph-calendar-check"></i>
					{m.calendarExportOpenApp()}
				</a>
				<a
					class="btn btn-sm"
					href={googleCalendarSubscribeUrl(feedUrl)}
					target="_blank"
					rel="noopener noreferrer"
				>
					<i aria-hidden="true" class="ph-duotone ph-google-logo"></i>
					{m.calendarExportGoogle()}
				</a>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			</div>
			<p class="text-base-content/70 text-sm">{m.calendarExportSecret()}</p>
		{:else}
			<span class="loading loading-dots" aria-label={m.genericToastLoading()}></span>
		{/if}
	</div>
	{#snippet action()}
		<button
			type="button"
			class="btn btn-ghost text-error"
			disabled={!feedUrl}
			onclick={() => (confirmReset = true)}
		>
			{m.calendarExportReset()}
		</button>
		<button type="button" class="btn" onclick={() => (open = false)}>{m.close()}</button>
	{/snippet}
</Modal>

{#if confirmReset}
	<ActionModal
		title={m.calendarExportReset()}
		confirmLabel={m.calendarExportReset()}
		confirmClass="btn-error"
		loading={resetting}
		onConfirm={reset}
		onClose={() => (confirmReset = false)}
	>
		<p class="py-4">{m.calendarExportResetConfirm()}</p>
	</ActionModal>
{/if}
