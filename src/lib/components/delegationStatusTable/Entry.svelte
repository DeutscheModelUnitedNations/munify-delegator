<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { AdministrativestatusEnum } from '$lib/api/rumbleClient/client';
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
		DONE: 'fa-circle-check text-success',
		PROBLEM: 'fa-triangle-exclamation fa-beat text-error',
		PENDING: 'fa-hourglass-half text-warning'
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
		<i class="{dashClass} fa-dash"></i>
	{/if}
{/snippet}

{#snippet statusCell(status: AdministrativestatusEnum, tooltip: string)}
	<div class="tooltip" data-tip={tooltip}>
		<i class="fas {statusIcons[status]}"></i>
	</div>
{/snippet}

{#snippet downloadButton(run: () => Promise<void>)}
	<div class="tooltip" data-tip={m.downloadPostalDocuments()}>
		<button
			class="btn btn-ghost btn-sm mr-1"
			onclick={() => download(run)}
			disabled={loading}
			aria-label="Download Postal Registration PDF"
		>
			<i
				class={loading
					? 'fa-sharp-duotone fa-solid fa-spinner fa-spin'
					: 'fa-sharp-duotone fa-solid fa-download'}
			></i>
		</button>
	</div>
{/snippet}

<tr>
	<td
		><span class="mr-2">{name}</span>
		{#if headDelegate}
			<div class="tooltip" data-tip={m.headDelegate()}>
				<i class="fa-sharp-duotone fa-solid fa-medal ml-2"></i>
			</div>
		{/if}
	</td>
	<td>
		{@render valueOrDash(pronouns, 'fa-sharp-duotone fa-solid')}
	</td>

	{#if committee != undefined}
		<td>
			{@render valueOrDash(committee, 'fas')}
		</td>
	{/if}

	{#if email}
		<td>
			<a class="btn btn-ghost btn-sm" href={`mailto:${email}`} aria-label="E-Mail">
				<i class="fa-sharp-duotone fa-solid fa-envelope"></i>
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
				<i class="fas fa-dash text-base-300"></i>
			{/if}
		</td>
	{/if}
	<td class="text-right">
		{#if children}
			{@render children()}
		{/if}
	</td>
</tr>
