<script lang="ts">
	import type { Snippet } from 'svelte';

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
					<th>Name</th>
					{#if withCommittee}
						<th>Gremium</th>
					{/if}
					{#if withMailStatus}
						<th class="text-center"><i class="text-xl fa-duotone fa-envelope-open-text"></i></th>
					{/if}
					{#if withPaymentStatus}
						<th class="text-center"><i class="text-xl fa-duotone fa-money-bill-transfer"></i></th>
					{/if}
					<th></th>
				</tr>
			</thead>
			<tbody>
				{@render children()}
			</tbody>
		</table>
	</div>
</div>
