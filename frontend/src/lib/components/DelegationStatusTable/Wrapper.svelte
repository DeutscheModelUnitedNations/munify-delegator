<script lang="ts">
	interface Props {
		withCommittee?: boolean;
		withMailStatus?: boolean;
		withPaymentStatus?: boolean;
	}

	let { withCommittee = false, withMailStatus = false, withPaymentStatus = false }: Props = $props();
</script>

<div class="card bg-base-100 shadow-md overflow-x-auto">
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
				<slot />
			</tbody>
		</table>
	</div>
</div>
