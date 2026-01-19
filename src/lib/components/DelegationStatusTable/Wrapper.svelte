<script lang="ts">
	import type { Snippet } from 'svelte';
	import { m } from '$lib/paraglide/messages';
	import DashboardContentCard from '$lib/components/Dashboard/DashboardContentCard.svelte';

	interface Props {
		title?: string;
		description?: string;
		withEmail?: boolean;
		withCommittee?: boolean;
		withPostalSatus?: boolean;
		withPaymentStatus?: boolean;
		withPaperCount?: boolean;
		children: Snippet;
	}

	let {
		title,
		description,
		withEmail = false,
		withCommittee = false,
		withPostalSatus = false,
		withPaymentStatus = false,
		withPaperCount = false,
		children
	}: Props = $props();
</script>

<DashboardContentCard {title} {description} class="overflow-x-auto">
	<table class="table">
		<thead>
			<tr>
				<th>{m.name()}</th>
				<th>{m.pronouns()}</th>
				{#if withCommittee}
					<th>{m.committee()}</th>
				{/if}
				{#if withEmail}
					<th>{m.email()}</th>
				{/if}
				{#if withPostalSatus}
					<th class="text-center">
						<div class="tooltip" data-tip="Postialische Anmeldung">
							<i class="fa-duotone fa-envelopes-bulk"></i>
						</div>
					</th>
				{/if}
				{#if withPaymentStatus}
					<th class="text-center">
						<div class="tooltip" data-tip="Beitragszahlung">
							<i class="fa-duotone fa-money-bill-transfer"></i>
						</div>
					</th>
				{/if}
				{#if withPaperCount}
					<th class="text-center">
						<div class="tooltip" data-tip={m.papers()}>
							<i class="fa-duotone fa-file-lines"></i>
						</div>
					</th>
				{/if}
				<th></th>
			</tr>
		</thead>
		<tbody>
			{#if children}
				{@render children()}
			{:else}
				<tr>
					<td>{m.noMembersFound()}</td>
				</tr>
			{/if}
		</tbody>
	</table>
</DashboardContentCard>
