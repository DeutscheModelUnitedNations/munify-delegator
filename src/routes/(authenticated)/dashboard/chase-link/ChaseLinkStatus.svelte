<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import { client } from '#lib/api/rumbleClient/client';

	/** How the link fares. The link itself is configuration (`LINK_REMOTE_URL` and the rest). */
	const links = $derived(
		await client.liveQuery.instanceLinks({
			remoteUrl: true,
			lastEventAt: true,
			lastReconcileAt: true,
			lastError: true
		})
	);
	const link = $derived(links.at(0));

	const formatTime = (date: Date | null | undefined) =>
		date ? date.toLocaleString(getLocale(), { dateStyle: 'medium', timeStyle: 'short' }) : '–';
</script>

{#if !link}
	<p class="text-base-content/70">{m.chaseLinkNoneIntro()}</p>
{:else}
	<div class="alert alert-success">
		<i aria-hidden="true" class="ph-duotone ph-link"></i>
		<span>{m.chaseLinkActiveIntro({ url: link.remoteUrl })}</span>
	</div>
	<dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
		<dt class="text-base-content/70">{m.chaseLinkLastEvent()}</dt>
		<dd>{formatTime(link.lastEventAt)}</dd>
		<dt class="text-base-content/70">{m.chaseLinkLastReconcile()}</dt>
		<dd>{formatTime(link.lastReconcileAt)}</dd>
	</dl>
	{#if link.lastError}
		<div class="alert alert-warning">
			<i aria-hidden="true" class="ph-duotone ph-warning"></i>
			<span>{m.chaseLinkLastError({ error: link.lastError })}</span>
		</div>
	{/if}
	<a class="btn btn-primary self-start" href={link.remoteUrl} target="_blank" rel="noopener">
		<i aria-hidden="true" class="ph-duotone ph-arrow-square-out"></i>
		{m.chaseLinkOpen()}
	</a>
{/if}
