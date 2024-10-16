<script lang="ts">
	import type { User } from '@prisma/client';

	interface Props {
		headline: string;
		items: User[];
	}

	let { headline, items }: Props = $props();
</script>

<tr>
	<td>{headline}</td>
	<td>
		{#if items.length > 0}
			<i class="fas fa-circle-xmark text-error text-xl"></i>
		{:else}
			<i class="fas fa-circle-check text-success text-xl"></i>
		{/if}
	</td>
	<td>{items.length}</td>
</tr>
