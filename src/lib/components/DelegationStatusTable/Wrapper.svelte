<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as m from '$lib/paraglide/messages.js';

	interface Props {
		withCommittee?: boolean;
		withMailStatus?: boolean;
		withPaymentStatus?: boolean;
		children: Snippet;
	}

	let {
		withCommittee = false,
		withMailStatus = false,
		withPaymentStatus = false,
		children
	}: Props = $props();
</script>

<div class="card bg-base-100 dark:bg-base-200 shadow-md overflow-x-auto">
	<div class="card-body">
		<table class="table">
			<thead>
				<tr>
					<th>{m.name()}</th>
					{#if withCommittee}
						<th>{m.committee()}</th>
					{/if}
					{#if withMailStatus}
						<th class="text-center">
							<div class="tooltip" data-tip="Postialische Anmeldung">
								<i class="text-xl fa-duotone fa-envelope-open-text"></i>
							</div>
						</th>
					{/if}
					{#if withPaymentStatus}
						<th class="text-center">
							<div class="tooltip" data-tip="Beitragszahlung">
								<i class="text-xl fa-duotone fa-money-bill-transfer"></i>
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
	</div>
</div>
