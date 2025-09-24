<script lang="ts">
	import type { Snippet } from 'svelte';
	import { m } from '$lib/paraglide/messages';
	import DashboardContentCard from '$lib/components/Dashboard/DashboardContentCard.svelte';

	interface Props {
		title?: string;
		description?: string;
		withCommittee?: boolean;
		withMailStatus?: boolean;
		withPaymentStatus?: boolean;
		children: Snippet;
	}

	let {
		title,
		description,
		withCommittee = false,
		withMailStatus = false,
		withPaymentStatus = false,
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
				{#if withMailStatus}
					<th class="text-center">
						<div class="tooltip" data-tip="Postialische Anmeldung">
							<i class="fa-duotone fa-envelope-open-text text-xl"></i>
						</div>
					</th>
				{/if}
				{#if withPaymentStatus}
					<th class="text-center">
						<div class="tooltip" data-tip="Beitragszahlung">
							<i class="fa-duotone fa-money-bill-transfer text-xl"></i>
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
