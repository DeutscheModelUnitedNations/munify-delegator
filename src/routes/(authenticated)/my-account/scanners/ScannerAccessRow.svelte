<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import ConfirmDeleteModal from '#lib/components/ConfirmDeleteModal.svelte';
	import { getLocale } from '#lib/paraglide/runtime';
	import { m } from '#lib/paraglide/messages';
	import { genericPromiseToastMessages } from '#lib/utils/toast';

	/** A device's login: when it last delivered, until when it may, and revoking it alone. */
	interface Props {
		access: {
			id: string;
			name: string;
			username: string;
			lastUsedAt?: Date | null;
			expiresAt: Date;
		};
		/** Lets it work for longer. */
		renewable: boolean;
	}

	let { access, renewable }: Props = $props();

	let revoking = $state(false);
	const expired = $derived(access.expiresAt <= new Date());
	const lastUsed = $derived(
		access.lastUsedAt?.toLocaleString(getLocale(), { dateStyle: 'medium', timeStyle: 'short' })
	);
	const until = $derived(access.expiresAt.toLocaleDateString(getLocale(), { dateStyle: 'medium' }));

	async function renew() {
		const promise = Promise.resolve(
			client.mutate.renewScannerAccess({ __args: { id: access.id } })
		);
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
	}

	async function revoke() {
		const promise = Promise.resolve(
			client.mutate.deleteScannerAccess({ __args: { id: access.id } })
		);
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		revoking = false;
	}
</script>

<li class="flex flex-wrap items-center gap-2 px-4 py-2">
	<i aria-hidden="true" class="ph-duotone ph-printer text-primary text-2xl"></i>
	<span class="flex min-w-40 grow flex-col">
		<span class="truncate font-medium">{access.name}</span>
		<span class="text-base-content/60 text-xs">
			<span class="font-mono">{access.username}</span> ·
			{lastUsed ? m.scannerSetupLastUsed({ date: lastUsed }) : m.scannerSetupNeverUsed()} ·
			<span class={[expired && 'text-error font-semibold']}>
				{expired ? m.scannerSetupExpired() : m.scannerSetupExpires({ date: until })}
			</span>
		</span>
	</span>
	{#if renewable}
		<button
			type="button"
			class="btn btn-ghost btn-sm"
			onclick={renew}
			aria-label="{m.scannerSetupRenew()}: {access.name}"
		>
			{m.scannerSetupRenew()}
		</button>
	{/if}
	<button
		type="button"
		class="btn btn-ghost btn-sm text-error"
		onclick={() => (revoking = true)}
		aria-label="{m.scannerSetupDelete()}: {access.name}"
	>
		<i aria-hidden="true" class="ph-duotone ph-trash"></i>
		{m.scannerSetupDelete()}
	</button>
</li>

{#if revoking}
	<ConfirmDeleteModal
		title={m.scannerSetupRevokeTitle({ name: access.name })}
		text={m.scannerSetupRevokeConfirm()}
		onConfirm={revoke}
		onClose={() => (revoking = false)}
	/>
{/if}
