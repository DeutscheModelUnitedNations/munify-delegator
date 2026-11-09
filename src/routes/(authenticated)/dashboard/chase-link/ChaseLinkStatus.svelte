<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import { client } from '#lib/api/rumbleClient/client';
	import { confirmDialog } from '#lib/state/dialogs.svelte.js';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import ChaseLinkRequestForm from './ChaseLinkRequestForm.svelte';

	/** The link as a system admin reads it: everything but its tokens. */
	const links = $derived(
		await client.liveQuery.instanceLinks({
			remoteUrl: true,
			status: true,
			confirmationCode: true,
			linkedAt: true,
			lastEventAt: true,
			lastReconcileAt: true,
			lastError: true
		})
	);
	const link = $derived(links.find((l) => l.status !== 'FROZEN'));

	const formatTime = (date: Date | null | undefined) =>
		date ? date.toLocaleString(getLocale(), { dateStyle: 'medium', timeStyle: 'short' }) : '–';

	async function unlink() {
		if (link?.status === 'ACTIVE') {
			const confirmed = await confirmDialog({
				title: m.chaseLinkUnlink(),
				text: m.chaseLinkUnlinkConfirm(),
				confirmLabel: m.chaseLinkUnlink(),
				danger: true
			});
			if (!confirmed) return;
		}
		const promise = Promise.resolve(client.mutate.unlinkChase());
		toast.promise(promise, genericPromiseToastMessages);
		await promise.catch(() => undefined);
	}
</script>

{#if !link}
	<p class="text-base-content/70">{m.chaseLinkNoneIntro()}</p>
	<ChaseLinkRequestForm />
{:else if link.status === 'PENDING'}
	<div class="alert alert-info flex flex-col items-start gap-3">
		<p>{m.chaseLinkPendingIntro({ url: link.remoteUrl })}</p>
		<p class="font-mono text-3xl font-bold tracking-widest" data-testid="chase-link-code">
			{link.confirmationCode}
		</p>
	</div>
	<button class="btn btn-ghost self-start" onclick={unlink}>
		<i class="ph-duotone ph-x"></i>
		{m.chaseLinkWithdraw()}
	</button>
{:else}
	<div class="alert alert-success">
		<i class="ph-duotone ph-link"></i>
		<span>{m.chaseLinkActiveIntro({ url: link.remoteUrl })}</span>
	</div>
	<dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
		<dt class="text-base-content/70">{m.chaseLinkLinkedAt()}</dt>
		<dd>{formatTime(link.linkedAt)}</dd>
		<dt class="text-base-content/70">{m.chaseLinkLastEvent()}</dt>
		<dd>{formatTime(link.lastEventAt)}</dd>
		<dt class="text-base-content/70">{m.chaseLinkLastReconcile()}</dt>
		<dd>{formatTime(link.lastReconcileAt)}</dd>
	</dl>
	{#if link.lastError}
		<div class="alert alert-warning">
			<i class="ph-duotone ph-warning"></i>
			<span>{m.chaseLinkLastError({ error: link.lastError })}</span>
		</div>
	{/if}
	<div class="flex flex-wrap gap-2">
		<a class="btn btn-primary" href={link.remoteUrl} target="_blank" rel="noopener">
			<i class="ph-duotone ph-arrow-square-out"></i>
			{m.chaseLinkOpen()}
		</a>
		<button class="btn btn-error btn-outline" onclick={unlink}>
			<i class="ph-duotone ph-link-break"></i>
			{m.chaseLinkUnlink()}
		</button>
	</div>
{/if}
