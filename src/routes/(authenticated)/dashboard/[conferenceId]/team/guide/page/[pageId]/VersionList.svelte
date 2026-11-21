<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';

	/** The page's published versions, newest first, each to restore; with the committee text. */
	interface Props {
		versions: readonly {
			id: string;
			number: number;
			title: string;
			createdAt: Date | string;
			pdfUrl?: string | null;
		}[];
		onRestore: (versionId: string) => void;
	}

	let { versions, onRestore }: Props = $props();

	const dateTime = (value: Date | string) =>
		new Date(value).toLocaleString(getLocale(), { dateStyle: 'medium', timeStyle: 'short' });
	const sorted = $derived(versions.toSorted((a, b) => b.number - a.number));
</script>

<section
	class="flex flex-col gap-2"
	data-tour="team.guidePage.versions"
	aria-labelledby="guide-versions"
>
	<h2 id="guide-versions" class="text-lg font-semibold">{m.guideVersions()}</h2>
	<ul class="flex flex-col gap-1">
		{#each sorted as version (version.id)}
			<li class="flex flex-wrap items-center gap-2 text-sm">
				<span class="badge badge-sm">{version.number}</span>
				<span class="min-w-0 flex-1">{version.title} · {dateTime(version.createdAt)}</span>
				{#if version.pdfUrl}
					<a class="btn btn-xs btn-ghost" href={version.pdfUrl} target="_blank" rel="noopener">
						<i class="ph-duotone ph-file-pdf" aria-hidden="true"></i>
						{m.guideCommitteeTextDownload()}
					</a>
				{/if}
				<button class="btn btn-xs" onclick={() => onRestore(version.id)}>{m.guideRestore()}</button>
			</li>
		{:else}
			<li class="text-sm opacity-70">{m.guideNoVersions()}</li>
		{/each}
	</ul>
</section>
