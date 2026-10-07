<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { AgendaItem } from './types';

	interface Props {
		item: AgendaItem;
		onEdit: () => void;
		onDelete: () => void;
	}

	let { item, onEdit, onDelete }: Props = $props();
</script>

<li
	class="hover:bg-base-content/5 grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-0.5 px-4 py-0.5 md:grid-cols-[minmax(10rem,1fr)_2fr_5.5rem_auto]"
>
	<h4 class="font-medium">{item.title}</h4>
	<p
		class="text-base-content/60 order-last col-span-2 text-xs whitespace-pre-wrap md:order-none md:col-span-1 md:text-sm"
	>
		{item.teaserText ?? ''}
	</p>
	<span
		class="text-base-content/70 hidden items-center gap-1 text-sm md:flex {item.papers.length === 0
			? 'opacity-30'
			: ''}"
		title={item.papers.length === 1 ? m.paper() : m.papers()}
	>
		<i class="fa-duotone fa-file-lines"></i>
		{item.papers.length}
	</span>
	<div class="flex gap-1">
		<button class="btn btn-ghost btn-xs btn-square" aria-label={m.edit()} onclick={() => onEdit()}>
			<i class="fa-duotone fa-pen-to-square"></i>
		</button>
		<button
			class="btn btn-ghost btn-xs btn-square text-error"
			aria-label={m.delete()}
			onclick={() => onDelete()}
		>
			<i class="fa-duotone fa-xmark"></i>
		</button>
	</div>
</li>
