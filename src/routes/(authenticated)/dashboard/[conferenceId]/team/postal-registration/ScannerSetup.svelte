<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { page } from '$app/state';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import { canEditConference } from '#lib/helpers/teamAccess';
	import { fetchTeamAccess } from '#lib/api/teamAccess';
	import CopyLine from './CopyLine.svelte';
	import ScannerAccessRow from './ScannerAccessRow.svelte';
	import TeamScanners from './TeamScanners.svelte';

	/**
	 * The person's own logins, one for each device, and what to type into a device to deliver scans by
	 * email or WebDAV.
	 */
	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	const [accesses, smtp] = $derived(
		await Promise.all([
			client.liveQuery.myScannerAccesses({
				__args: { conferenceId },
				id: true,
				name: true,
				username: true,
				lastUsedAt: true,
				expiresAt: true
			}),
			client.query.smtpDelivery({ host: true, port: true, security: true })
		])
	);

	const managesConference = $derived(canEditConference(await fetchTeamAccess(conferenceId)));

	let name = $state('');
	let creating = $state(false);
	/** The logins just made, with their passwords, shown until typed in or the dialog closes. */
	let made = $state<{ id: string; name: string; username: string; password: string }[]>([]);
	const shown = $derived(made.filter(({ id }) => accesses.some((access) => access.id === id)));
	const webdavUrl = $derived(`${page.url.origin}/api/scans/`);

	async function create(event: SubmitEvent) {
		event.preventDefault();
		if (creating || !name.trim()) return;
		creating = true;
		const promise = client.mutate.createScannerAccess({
			__args: { conferenceId, name: name.trim() },
			id: true,
			name: true,
			username: true,
			password: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		try {
			const { id, name: device, username, password } = await promise;
			made = [{ id, name: device, username, password }, ...made];
			name = '';
		} catch {
			// the toast says why
		} finally {
			creating = false;
		}
	}
</script>

<div class="flex flex-col gap-5">
	<p class="text-sm">{m.scannerSetupIntro()}</p>

	<ul class="bg-base-200 rounded-box divide-base-300 flex flex-col divide-y">
		{#each accesses as access (access.id)}
			<ScannerAccessRow {access} renewable />
		{:else}
			<li class="text-base-content/60 px-4 py-3 text-sm">{m.scannerSetupNone()}</li>
		{/each}
	</ul>

	<form class="flex flex-wrap items-end gap-2" onsubmit={create}>
		<label class="flex min-w-56 grow flex-col gap-1 text-sm">
			{m.scannerSetupName()}
			<input
				class="input w-full"
				bind:value={name}
				maxlength="60"
				placeholder={m.scannerSetupNamePlaceholder()}
				required
			/>
		</label>
		<button class="btn btn-primary" disabled={creating || !name.trim()}>
			<i aria-hidden="true" class="ph-duotone ph-plus"></i>
			{m.scannerSetupCreate()}
		</button>
	</form>

	{#each shown as access (access.id)}
		<section class="alert alert-success items-start" role="status">
			<i aria-hidden="true" class="ph-duotone ph-key text-xl"></i>
			<div class="flex grow flex-col gap-2">
				<span class="font-semibold">{access.name}</span>
				<span class="text-sm">{m.scannerSetupPasswordOnce()}</span>
				<CopyLine label={m.scannerSetupUsername()} value={access.username} />
				<CopyLine label={m.scannerSetupPassword()} value={access.password} />
			</div>
			<button
				type="button"
				class="btn btn-sm"
				onclick={() => (made = made.filter(({ id }) => id !== access.id))}
				aria-label="{m.scannerSetupEntered()}: {access.name}"
			>
				{m.scannerSetupEntered()}
			</button>
		</section>
	{/each}

	<section class="flex flex-col gap-2">
		<h3 class="font-semibold">{m.scannerSetupEmailTitle()}</h3>
		{#if smtp}
			<CopyLine label={m.scannerSetupServer()} value={smtp.host} />
			<CopyLine label={m.scannerSetupPort()} value={String(smtp.port)} />
			<CopyLine label={m.scannerSetupSecurity()} value={smtp.security} />
			<p class="text-base-content/70 text-sm">{m.scannerSetupAddresses({ host: smtp.host })}</p>
		{:else}
			<p class="text-base-content/70 text-sm">{m.scannerSetupEmailOff()}</p>
		{/if}
	</section>

	<section class="flex flex-col gap-2">
		<h3 class="font-semibold">{m.scannerSetupWebdavTitle()}</h3>
		<CopyLine label={m.scannerSetupUrl()} value={webdavUrl} />
		<p class="text-base-content/70 text-sm">{m.scannerSetupWebdavHint()}</p>
	</section>

	{#if managesConference}
		<TeamScanners {conferenceId} ownIds={accesses.map(({ id }) => id)} />
	{/if}
</div>
