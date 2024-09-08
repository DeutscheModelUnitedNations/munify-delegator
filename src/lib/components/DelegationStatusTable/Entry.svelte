<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import type { Snippet } from 'svelte';

	interface Props {
		name: string;
		pronouns: string;
		headDelegate?: boolean;
		committee?: string;
		mailStatus?: 'completed' | 'error' | 'incomplete';
		paymentStatus?: 'completed' | 'error' | 'incomplete';
		children?: Snippet;
	}

	let {
		name,
		pronouns,
		headDelegate = false,
		committee,
		mailStatus,
		paymentStatus,
		children
	}: Props = $props();

	const getMailStatusTooltip = () => {
		switch (mailStatus) {
			case 'completed':
				return 'Postalische Anmeldung abgeschlossen';
			case 'error':
				return 'Postalische Anmeldung unvollständig';
			case 'incomplete':
				return 'Postalische Anmeldung ausstehend';
		}
	};

	const getPaymentStatusTooltip = () => {
		switch (paymentStatus) {
			case 'completed':
				return 'Beitragszahlung ist eingegangen';
			case 'error':
				return 'Probleme bei der Beitragszahlung';
			case 'incomplete':
				return 'Beitragszahlung ausstehend';
		}
	};
</script>

<tr>
	<td
		><span class="mr-2">{name}</span>
		{#if headDelegate}
			<div class="tooltip" data-tip={m.headDelegate()}>
				<i class="ml-2 fa-duotone fa-medal"></i>
			</div>
		{/if}
	</td>
	<td>
		{pronouns}
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
	{#if mailStatus}
		<td class="text-center">
			<div class="tooltip" data-tip={getMailStatusTooltip()}>
				{#if mailStatus === 'completed'}
					<i class="text-xl fas fa-circle-check text-success"></i>
				{:else if mailStatus === 'error'}
					<i class="text-xl fas fa-triangle-exclamation text-warning"></i>
				{:else}
					<i class="text-xl fas fa-octagon-xmark text-error"></i>
				{/if}
			</div>
		</td>
	{/if}
	{#if paymentStatus}
		<td class="text-center">
			<div class="tooltip" data-tip={getPaymentStatusTooltip()}>
				{#if paymentStatus === 'completed'}
					<i class="text-xl fas fa-circle-check text-success"></i>
				{:else if paymentStatus === 'error'}
					<i class="text-xl fas fa-triangle-exclamation text-warning"></i>
				{:else}
					<i class="text-xl fas fa-octagon-xmark text-error"></i>
				{/if}
			</div>
		</td>
	{/if}
	<td class="text-right">
		{#if children}
			{@render children()}
		{/if}
	</td>
</tr>
