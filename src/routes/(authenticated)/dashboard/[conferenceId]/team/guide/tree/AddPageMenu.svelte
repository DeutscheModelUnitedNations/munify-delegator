<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { WorkspacePage } from '#lib/guide/workspace';
	import StateDot from './StateDot.svelte';

	/**
	 * Adds a page to a section or the template: the general pages reaching the conference, those
	 * not in the guide yet first, found by title; or a new one.
	 */
	interface Props {
		pages: readonly (WorkspacePage & { inGuide: boolean })[];
		label: string;
		onPick: (pageId: string) => void;
		onCreate: () => void;
	}

	let { pages, label, onPick, onCreate }: Props = $props();

	let open = $state(false);
	let query = $state('');
	let menu = $state<HTMLElement>();

	const shown = $derived(
		pages
			.filter((page) => page.title.toLowerCase().includes(query.trim().toLowerCase()))
			.toSorted((a, b) => Number(a.inGuide) - Number(b.inGuide))
			.slice(0, 30)
	);

	function pick(pageId: string) {
		open = false;
		query = '';
		onPick(pageId);
	}

	function closeOutside(event: MouseEvent) {
		if (open && event.target instanceof Node && !menu?.contains(event.target)) open = false;
	}
</script>

<svelte:window onclick={closeOutside} />

<details class="dropdown w-full" bind:open bind:this={menu}>
	<summary class="btn btn-ghost btn-xs w-full justify-start font-normal opacity-70">
		<i class="ph-duotone ph-plus" aria-hidden="true"></i>
		{label}
	</summary>
	<!-- the list only while open: a closed menu in every section would carry every page -->
	{#if open}
		<div
			class="dropdown-content bg-base-100 rounded-box border-base-300 z-30 flex w-72 flex-col gap-2 border p-2 shadow-lg"
		>
			<input
				class="input input-sm w-full"
				placeholder={m.guideTreeSearchPages()}
				aria-label={m.guideTreeSearchPages()}
				bind:value={query}
			/>
			<ul class="menu max-h-72 w-full flex-nowrap overflow-y-auto p-0">
				{#each shown as page (page.id)}
					<li>
						<button type="button" onclick={() => pick(page.id)}>
							<StateDot state={page.state} />
							<span class="min-w-0 flex-1 truncate">{page.title}</span>
							{#if page.inGuide}<span class="badge badge-ghost badge-xs"
									>{m.guideTreeInGuide()}</span
								>{/if}
						</button>
					</li>
				{:else}
					<li class="menu-disabled"><span>{m.guideNoPagesFiltered()}</span></li>
				{/each}
			</ul>
			<button
				type="button"
				class="btn btn-sm btn-primary"
				onclick={() => {
					open = false;
					onCreate();
				}}
			>
				<i class="ph-duotone ph-file-plus" aria-hidden="true"></i>
				{m.guideNewPage()}
			</button>
		</div>
	{/if}
</details>
