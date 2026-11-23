<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { TreeMenuItem } from './treeMenu';

	/** The "…" menu of a row or heading of the guide tree. Closes on a choice or a click elsewhere. */
	let { items, label = m.guideTreeActions() }: { items: readonly TreeMenuItem[]; label?: string } =
		$props();

	let open = $state(false);
	let menu = $state<HTMLElement>();

	function closeOutside(event: MouseEvent) {
		if (open && event.target instanceof Node && !menu?.contains(event.target)) open = false;
	}
</script>

<svelte:window onclick={closeOutside} />

<details class="dropdown dropdown-end shrink-0" bind:open bind:this={menu}>
	<summary class="btn btn-ghost btn-xs btn-square" aria-label={label}>
		<i class="ph-duotone ph-dots-three-vertical" aria-hidden="true"></i>
	</summary>
	<ul
		class="menu dropdown-content bg-base-100 rounded-box border-base-300 z-30 w-64 border p-1 shadow-lg"
	>
		{#each items as item, index (index)}
			<li class={[item.disabled && 'menu-disabled', item.indent && 'ps-4']}>
				{#if item.onSelect}
					<button
						type="button"
						class={item.danger ? 'text-error' : ''}
						disabled={item.disabled}
						onclick={() => {
							open = false;
							item.onSelect?.();
						}}
					>
						{#if item.icon}<i class="ph-duotone {item.icon}" aria-hidden="true"></i>{/if}
						{item.label}
					</button>
				{:else}
					<span class="menu-title">{item.label}</span>
				{/if}
			</li>
		{/each}
	</ul>
</details>
