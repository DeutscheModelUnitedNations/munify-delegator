<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	/** The committee matrix's heading row: each committee with how many own pages are published. */
	interface Props {
		committees: readonly { id: string; name: string; abbreviation: string }[];
		progress: readonly { published: number; total: number }[];
	}

	let { committees, progress }: Props = $props();
</script>

<thead>
	<tr>
		<th scope="col">{m.guideCommitteesStep()}</th>
		{#each committees as committee, index (committee.id)}
			{@const done = progress[index]}
			<th scope="col" class="min-w-32">
				<span class="text-base" title={committee.name}>{committee.abbreviation}</span>
				<progress
					class="progress progress-success block h-1.5 w-full"
					value={done.published}
					max={Math.max(done.total, 1)}
					aria-label={m.guideCommitteeProgress(done)}
				></progress>
				<span class="text-xs font-normal opacity-70">{done.published}/{done.total}</span>
			</th>
		{/each}
	</tr>
</thead>
