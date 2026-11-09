<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	/** A row standing in while a group's rows load. */
	interface Props {
		colspan: number;
		level: number;
	}

	let { colspan, level }: Props = $props();
</script>

<tr>
	<td {colspan} class="py-2" style="padding-left:{level * 1.25 + 1}rem">
		<span class="loading loading-dots loading-sm" aria-label={m.dataGridLoadingRows()}></span>
	</td>
</tr>
