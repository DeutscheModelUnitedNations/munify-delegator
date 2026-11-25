<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';

	/** The sidebar's published versions, newest first, each to restore into the draft. */
	interface Props {
		versions: readonly { id: string; number: number; createdAt: Date | string }[];
		onRestore: (versionId: string) => void;
	}

	let { versions, onRestore }: Props = $props();
	const sorted = $derived(versions.toSorted((a, b) => b.number - a.number));
	const dateTime = (value: Date | string) =>
		new Date(value).toLocaleString(getLocale(), { dateStyle: 'medium', timeStyle: 'short' });
</script>

{#if sorted.length > 0}
	<details class="collapse-arrow bg-base-200 rounded-box collapse">
		<summary class="collapse-title font-semibold">{m.guideVersions()}</summary>
		<ul class="collapse-content flex flex-col gap-1">
			{#each sorted as version (version.id)}
				<li class="flex items-center gap-2 text-sm">
					<span class="badge badge-sm">{version.number}</span>
					<span class="flex-1">{dateTime(version.createdAt)}</span>
					<button class="btn btn-xs" onclick={() => onRestore(version.id)}
						>{m.guideRestore()}</button
					>
				</li>
			{/each}
		</ul>
	</details>
{/if}
