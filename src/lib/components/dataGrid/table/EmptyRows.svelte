<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	/** What a table without matching rows shows, across all its columns. */
	interface Props {
		colspan: number;
		text?: string;
	}

	let { colspan, text = m.noResults() }: Props = $props();
</script>

<tbody>
	<tr>
		<td {colspan} class="text-base-content/60 py-10 text-center">
			<i class="fa-sharp-duotone fa-solid fa-filter-circle-xmark mb-2 block text-3xl"></i>
			{text}
		</td>
	</tr>
</tbody>
