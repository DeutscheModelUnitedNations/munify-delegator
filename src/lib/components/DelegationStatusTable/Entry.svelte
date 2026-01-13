<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { AdministrativeStatus } from '@prisma/client';
	import type { Snippet } from 'svelte';

	interface Props {
		name: string;
		pronouns?: string | null;
		email?: string;
		headDelegate?: boolean;
		committee?: string;
		postalSatus?: AdministrativeStatus;
		paymentStatus?: AdministrativeStatus;
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
</script>

<tr>
	<td
		><span class="mr-2">{name}</span>
		{#if headDelegate}
			<div class="tooltip" data-tip={m.headDelegate()}>
				<i class="fa-duotone fa-medal ml-2"></i>
			</div>
		{/if}
	</td>
	<td>
		{#if pronouns}
			{pronouns}
		{:else}
			<i class="fa-duotone fa-dash"></i>
		{/if}
	</td>

	{#if committee != undefined}
		<td>
			{#if committee}
				{committee}
			{:else}
				<i class="fas fa-dash"></i>
			{/if}
		</td>
	{/if}

	{#if email}
		<td>
			<a class="btn btn-ghost btn-sm" href={`mailto:${email}`} aria-label="E-Mail">
				<i class="fa-duotone fa-envelope"></i>
			</a>
		</td>
	{/if}

	{#if withPostalStatus}
		<td class="text-center">
			{#if downloadPostalDocuments}
				<div class="tooltip" data-tip={m.downloadPostalDocuments()}>
					<button
						class="btn btn-ghost btn-sm mr-1"
						onclick={async () => {
							loading = true;
							await downloadPostalDocuments();
							loading = false;
						}}
						disabled={loading}
						aria-label="Download Postal Registration PDF"
					>
						{#if loading}
							<i class="fa-solid fa-spinner fa-spin"></i>
						{:else}
							<i class="fa-duotone fa-download"></i>
						{/if}
					</button>
				</div>
			{/if}
			<div class="tooltip" data-tip={getMailStatusTooltip()}>
				{#if postalSatus === 'DONE'}
					<i class="fas fa-circle-check text-success"></i>
				{:else if postalSatus === 'PROBLEM'}
					<i class="fas fa-triangle-exclamation fa-beat text-error"></i>
				{:else}
					<i class="fas fa-hourglass-half text-warning"></i>
				{/if}
			</div>
		</td>
	{/if}
	{#if withPaymentStatus}
		<td class="text-center">
			<div class="tooltip" data-tip={getPaymentStatusTooltip()}>
				{#if paymentStatus === 'DONE'}
					<i class="fas fa-circle-check text-success"></i>
				{:else if paymentStatus === 'PROBLEM'}
					<i class="fas fa-triangle-exclamation fa-beat text-error"></i>
				{:else}
					<i class="fas fa-hourglass-half text-warning"></i>
				{/if}
			</div>
		</td>
	{/if}
	{#if withPaperCount}
		<td class="text-center">
			{#if paperCount > 0}
				<span class="badge badge-sm badge-primary">{paperCount}</span>
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
