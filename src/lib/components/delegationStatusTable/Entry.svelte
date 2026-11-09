<script lang="ts">
	import HeadDelegateMark from './HeadDelegateMark.svelte';
	import { m } from '#lib/paraglide/messages';
	import type { AdministrativestatusEnum } from '#lib/api/rumbleClient/client';
	import type { Snippet } from 'svelte';

	interface Props {
		name: string;
		pronouns?: string | null;
		email?: string;
		headDelegate?: boolean;
		committee?: string;
		postalSatus?: AdministrativestatusEnum;
		paymentStatus?: AdministrativestatusEnum;
		downloadPostalDocuments?: () => Promise<void>;
		withPostalStatus?: boolean;
		withPaymentStatus?: boolean;
		withPaperCount?: boolean;
		paperCount?: number;
		children?: Snippet;
	}

	let {
		name,
		pronouns,
		email,
		headDelegate = false,
		committee,
		postalSatus = 'PENDING',
		paymentStatus = 'PENDING',
		downloadPostalDocuments,
		withPostalStatus = false,
		withPaymentStatus = false,
		withPaperCount = false,
		paperCount = 0,
		children
	}: Props = $props();

	const getMailStatusTooltip = () => {
		switch (postalSatus) {
			case 'DONE':
				return m.postalDone();
			case 'PROBLEM':
				return m.postalProblem();
			case 'PENDING':
				return m.postalPending();
		}
	};

	const getPaymentStatusTooltip = () => {
		switch (paymentStatus) {
			case 'DONE':
				return m.paymentDone();
			case 'PROBLEM':
				return m.paymentProblem();
			case 'PENDING':
				return m.paymentPending();
		}
	};

	let loading = $state(false);

	const statusIcons: Record<AdministrativestatusEnum, string> = {
		DONE: 'ph-check-circle text-success',
		PROBLEM: 'ph-warning icon-beat text-error',
		PENDING: 'ph-hourglass-medium text-warning'
	};

	const download = async (run: () => Promise<void>) => {
		loading = true;
		await run();
		loading = false;
	};
</script>

{#snippet valueOrDash(value: string | null | undefined, dashClass: string)}
	{#if value}
		{value}
	{:else}
		<i aria-hidden="true" class="{dashClass} ph-minus"></i>
	{/if}
{/snippet}

{#snippet statusCell(status: AdministrativestatusEnum, tooltip: string)}
	<div class="tooltip" data-tip={tooltip}>
		<i aria-hidden="true" class="ph-fill {statusIcons[status]}"></i>
		<span class="sr-only">{tooltip}</span>
	</div>
{/snippet}

{#snippet downloadButton(run: () => Promise<void>)}
	<div class="tooltip" data-tip={m.downloadPostalDocuments()}>
		<button
			class="btn btn-ghost btn-sm mr-1"
			onclick={() => download(run)}
			disabled={loading}
			aria-label={m.a11yDownloadPostalPdf()}
		>
			<i
				aria-hidden="true"
				class={loading ? 'ph-duotone ph-spinner-gap animate-spin' : 'ph-duotone ph-download-simple'}
			></i>
		</button>
	</div>
{/snippet}

<tr>
	<td
		><span class="mr-2">{name}</span>
		{#if headDelegate}
			<HeadDelegateMark />
		{/if}
	</td>
	<td>
		{@render valueOrDash(pronouns, 'ph-duotone')}
	</td>

	{#if committee != undefined}
		<td>
			{@render valueOrDash(committee, 'ph-fill')}
		</td>
	{/if}

	{#if email}
		<td>
			<a class="btn btn-ghost btn-sm" href={`mailto:${email}`} aria-label={m.email()}>
				<i aria-hidden="true" class="ph-duotone ph-envelope"></i>
			</a>
		</td>
	{/if}

	{#if withPostalStatus}
		<td class="text-center">
			{#if downloadPostalDocuments}
				{@render downloadButton(downloadPostalDocuments)}
			{/if}
			{@render statusCell(postalSatus, getMailStatusTooltip())}
		</td>
	{/if}
	{#if withPaymentStatus}
		<td class="text-center">
			{@render statusCell(paymentStatus, getPaymentStatusTooltip())}
		</td>
	{/if}
	{#if withPaperCount}
		<td class="text-center">
			{#if paperCount > 0}
				<span class="badge badge-sm badge-soft badge-primary">{paperCount}</span>
			{:else}
				<i aria-hidden="true" class="ph-fill ph-minus text-base-300"></i>
				<span class="sr-only">0</span>
			{/if}
		</td>
	{/if}
	<td class="text-right">
		{#if children}
			{@render children()}
		{/if}
	</td>
</tr>
