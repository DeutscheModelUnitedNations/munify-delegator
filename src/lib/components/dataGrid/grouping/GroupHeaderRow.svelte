<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	/** The header of a group: open or close it, what it is, how many rows it holds. */
	interface Props {
		colspan: number;
		level: number;
		columnLabel: string;
		label: string;
		count: number;
		open: boolean;
		ontoggle: () => void;
	}

	let { colspan, level, columnLabel, label, count, open, ontoggle }: Props = $props();
</script>

<tr class="bg-base-200/60 hover:bg-base-200">
	<td {colspan} class="py-1.5">
		<button
			class="flex w-full items-center gap-2 text-left"
			style="padding-left:{level * 1.25}rem"
			aria-expanded={open}
			onclick={ontoggle}
		>
			<i
				aria-hidden="true"
				class="ph-duotone ph-caret-right text-xs transition-transform"
				class:rotate-90={open}
			></i>
			<span class="text-base-content/60 text-xs">{columnLabel}</span>
			<span class="font-semibold">{label}</span>
			<span class="badge badge-sm badge-ghost tabular-nums" title={m.dataGridGroupCount({ count })}>
				{count}
			</span>
		</button>
	</td>
</tr>
