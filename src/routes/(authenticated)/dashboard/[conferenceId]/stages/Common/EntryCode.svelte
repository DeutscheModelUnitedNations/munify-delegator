<script lang="ts">
	import Modal from '$lib/components/Modal.svelte';
	import { m } from '$lib/paraglide/messages';
	import { qr } from '@svelte-put/qr/svg';
	import toast from 'svelte-french-toast';

	interface Props {
		entryCode: string;
		referralLink: string;
		userHasRotationPermission: boolean;
		rotationFn?: () => void;
	}

	let { entryCode, referralLink, userHasRotationPermission, rotationFn }: Props = $props();

	let qrModalOpen = $state(false);
</script>

<div class="bg-base-200 border-base-300 mt-4 flex items-center gap-2 rounded-lg border p-2 pl-4">
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
		><i class="fa-duotone fa-clipboard text-xl"></i>
	</button>
	<button
		class="btn btn-square btn-ghost"
		onclick={() => {
			navigator.clipboard.writeText(referralLink as string);
			toast.success(m.linkCopied());
		}}
		aria-label="Copy referral link"
		><i class="fa-duotone fa-link text-xl"></i>
	</button>
	<button
		class="btn btn-square btn-ghost"
		onclick={() => (qrModalOpen = true)}
		aria-label="Open QR-Code"
		><i class="fa-duotone fa-qrcode text-xl"></i>
	</button>
	{#if userHasRotationPermission}
		<div class="tooltip" data-tip={m.rotateCode()}>
			<button class="btn btn-square btn-ghost" onclick={rotationFn} aria-label="Rotate entry code"
				><i class="fa-duotone fa-rotate text-xl"></i>
			</button>
		</div>
	{/if}
</div>

<Modal bind:open={qrModalOpen}>
	<div class="flex w-full items-center justify-center">
		<svg use:qr={{ data: referralLink, shape: 'circle' }} class="w-full max-w-sm" />
	</div>
</Modal>
