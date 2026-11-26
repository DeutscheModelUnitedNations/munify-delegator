<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { m } from '#lib/paraglide/messages';

	/** Each committee's own pages under the template: how many are published, to the matrix. */
	interface Props {
		committees: readonly { id: string; abbreviation: string; published: number; total: number }[];
		href: ResolvedPathname;
	}

	let { committees, href }: Props = $props();

	const done = (committee: { published: number; total: number }) =>
		committee.total > 0 && committee.published === committee.total;
</script>

<a {href} class="flex flex-wrap gap-1 px-2 pt-1 pb-2" aria-label={m.guideTreeCommitteeProgress()}>
	{#each committees as committee (committee.id)}
		<span
			class={['badge badge-sm', done(committee) ? 'badge-success' : 'badge-warning badge-outline']}
			title={m.guideCommitteeProgress(committee)}
		>
			{committee.abbreviation}
			<span class="opacity-70">{committee.published}/{committee.total}</span>
		</span>
	{/each}
</a>
