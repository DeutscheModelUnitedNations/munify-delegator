<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	/** The reader's sections and their pages; the open entry is marked. */
	interface Props {
		sections: readonly {
			key: string;
			title: string;
			entries: readonly { key: string; pageId: string; title: string; indent: number }[];
		}[];
		activeKey: string | null | undefined;
		hrefOf: (entry: { pageId: string; key?: string }) => string;
		onNavigate?: () => void;
	}

	let { sections, activeKey, hrefOf, onNavigate }: Props = $props();
</script>

<nav aria-label={m.guideNavigation()} data-testid="guide-sidebar">
	<ul class="menu w-full gap-1 p-0">
		{#each sections as section (section.key)}
			<li>
				<h2 class="menu-title text-base-content/80 px-2 text-xs uppercase">{section.title}</h2>
				<ul class="ms-0 ps-0 before:hidden">
					{#each section.entries as entry (entry.key)}
						<li class={entry.indent > 0 ? 'ps-4' : ''}>
							<a
								href={hrefOf({ pageId: entry.pageId, key: entry.key })}
								class={activeKey === entry.key ? 'menu-active' : ''}
								aria-current={activeKey === entry.key ? 'page' : undefined}
								onclick={onNavigate}>{entry.title}</a
							>
						</li>
					{/each}
				</ul>
			</li>
		{/each}
	</ul>
</nav>
