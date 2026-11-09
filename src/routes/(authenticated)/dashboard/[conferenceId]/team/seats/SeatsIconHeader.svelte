<script lang="ts">
	/** The header row of a seats table listing seats per row: what, who, how many. */
	interface Props {
		/** Phosphor icon class of the first column (e.g. 'ph-megaphone-simple') */
		icon: string;
		/** Adds the column of the members menu (`DelegationMembersMenu`) */
		membersMenu?: boolean;
	}

	let { icon, membersMenu = false }: Props = $props();
</script>

<thead>
	<tr>
		<td class="text-left">
			<i class="ph-duotone {icon}"></i>
		</td>
		<td class="text-left">
			<i class="ph-duotone ph-users"></i>
		</td>
		<td>
			<i class="ph-duotone ph-sigma"></i>
		</td>
		{#if membersMenu}
			<td>
				<i class="ph-duotone ph-users"></i>
			</td>
		{/if}
	</tr>
</thead>
