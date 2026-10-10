<script lang="ts">
	import Modal from '$lib/components/Modal.svelte';
	import { m } from '$lib/paraglide/messages';
	import { qr } from '@svelte-put/qr/svg';
	import { toast } from 'svelte-sonner';

	interface Props {
		entryCode: string;
		referralLink: string;
		/** Takes a supervisor straight to registering as one, whatever state the conference is in. */
		supervisorLink?: string;
		userHasRotationPermission: boolean;
		rotationFn?: () => void;
	}

	let { entryCode, referralLink, supervisorLink, userHasRotationPermission, rotationFn }: Props =
		$props();

	let qrModalOpen = $state(false);
</script>

<div class="bg-base-200 border-base-300 mt-4 flex items-center gap-2 rounded-box border p-2 pl-4">
	<p class="overflow-x-auto font-mono text-xl tracking-[0.6rem] uppercase">
		{entryCode}
	</p>
	<button
		class="btn btn-square btn-ghost"
		onclick={() => {
			navigator.clipboard.writeText(entryCode);
			toast.success(m.codeCopied());
		}}
		aria-label="Copy entry code"
		><i class="fa-sharp-duotone fa-solid fa-clipboard text-xl"></i>
	</button>
	<button
		class="btn btn-square btn-ghost"
		onclick={() => {
			navigator.clipboard.writeText(referralLink as string);
			toast.success(m.linkCopied());
		}}
		aria-label="Copy referral link"
		><i class="fa-sharp-duotone fa-solid fa-link text-xl"></i>
	</button>
	{#if supervisorLink}
		<button
			class="btn btn-square btn-ghost"
			onclick={() => {
				navigator.clipboard.writeText(supervisorLink);
				toast.success(m.linkCopied());
			}}
			aria-label="Copy supervisor link"
			><i class="fa-sharp-duotone fa-solid fa-chalkboard-user text-xl"></i>
		</button>
	{/if}
	<button
		class="btn btn-square btn-ghost"
		onclick={() => (qrModalOpen = true)}
		aria-label="Open QR-Code"
		><i class="fa-sharp-duotone fa-solid fa-qrcode text-xl"></i>
	</button>
	{#if userHasRotationPermission}
		<div class="tooltip" data-tip={m.rotateCode()}>
			<button class="btn btn-square btn-ghost" onclick={rotationFn} aria-label="Rotate entry code"
				><i class="fa-sharp-duotone fa-solid fa-rotate text-xl"></i>
			</button>
		</div>
	{/if}
</div>

<Modal bind:open={qrModalOpen}>
	<div class="flex w-full items-center justify-center">
		<svg use:qr={{ data: referralLink, shape: 'circle' }} class="w-full max-w-sm" />
	</div>
</Modal>
