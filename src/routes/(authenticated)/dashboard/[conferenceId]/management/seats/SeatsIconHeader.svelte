<script lang="ts">
	/** The header row of a seats table listing seats per row: what, who, how many. */
	interface Props {
		/** FontAwesome icon class of the first column (e.g. 'fa-megaphone') */
		icon: string;
	}

	let { icon }: Props = $props();
</script>

<thead>
	<tr>
		<td class="text-left">
			<i class="fa-duotone {icon}"></i>
		</td>
		<td class="text-left">
			<i class="fa-duotone fa-users"></i>
		</td>
		<td>
			<i class="fa-duotone fa-sigma"></i>
		</td>
	</tr>
</thead>
