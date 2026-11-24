<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { dev } from '$app/env';
	import { page } from '$app/state';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import CopyLine from './CopyLine.svelte';
	import ScannerAccessRow from './ScannerAccessRow.svelte';

	/**
	 * The person's scanners: a login for each device, which delivers into every conference whose
	 * participants they manage, and what to type into a device to deliver scans over WebDAV. Somebody who
	 * manages none any more still sees what they have, to remove it.
	 */

	const scanners = $derived(
		await client.liveQuery.myScanners({
			allowed: true,
			accesses: { name: true, username: true, lastUsedAt: true, expiresAt: true }
		})
	);
	const { allowed, accesses } = $derived(scanners);

	let name = $state('');
	let creating = $state(false);
	/** The logins just made, with their passwords, shown until typed in or the page is left. */
	let made = $state<{ id: string; name: string; username: string; password: string }[]>([]);
	const shown = $derived(made.filter(({ id }) => accesses.some((access) => access.id === id)));
	const webdavUrl = $derived(`${page.url.origin}/api/scans/`);

	async function create(event: SubmitEvent) {
		event.preventDefault();
		if (creating || !name.trim()) return;
		creating = true;
		const promise = client.mutate.createScannerAccess({
			__args: { name: name.trim() },
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

<svelte:head>
	<title>{dev ? '[dev] ' : ''}MUNify Delegator - {m.scannerSetupTitle()}</title>
</svelte:head>

<div class="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 max-sm:px-0 md:p-10">
	<header class="flex flex-col gap-2">
		<h1 class="text-3xl font-bold">{m.scannerSetupTitle()}</h1>
		<p class="text-base-content/70">{m.scannerSetupIntro()}</p>
	</header>

	{#if !allowed}
		<div class="alert" data-testid="scanners-none">
			<i aria-hidden="true" class="ph-duotone ph-printer text-xl"></i>
			<span>{m.scannerAccessNotAllowed()}</span>
		</div>
	{/if}

	<ul class="bg-base-200 rounded-box divide-base-300 flex flex-col divide-y">
		{#each accesses as access (access.id)}
			<ScannerAccessRow {access} renewable={allowed} />
		{:else}
			<li class="text-base-content/60 px-4 py-3 text-sm">{m.scannerSetupNone()}</li>
		{/each}
	</ul>

	{#if allowed}
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
	{/if}

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
		<h3 class="font-semibold">{m.scannerSetupWebdavTitle()}</h3>
		<CopyLine label={m.scannerSetupUrl()} value={webdavUrl} />
		<p class="text-base-content/70 text-sm">{m.scannerSetupWebdavHint()}</p>
	</section>
</div>
