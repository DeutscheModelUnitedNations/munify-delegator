<script lang="ts">
	import {
		matchReasons,
		snippetOf,
		type DeckStatus,
		type SearchFieldKind,
		type SightingEntry
	} from '$lib/assignment/sighting';
	import { m } from '$lib/paraglide/messages';

	/** The best matches of a search; picking one leaves the search and shows that application. */
	interface Props {
		search: string;
		results: SightingEntry[];
		total: number;
		onSelect: (id: string) => void;
	}

	let { search, results, total, onSelect }: Props = $props();

	const reasonLabels: Record<SearchFieldKind, () => string> = {
		codename: m.assignmentMatchName,
		id: m.assignmentMatchId,
		school: m.school,
		member: m.assignmentMatchMember,
		memberEmail: m.assignmentMatchMemberEmail,
		supervisor: m.assignmentMatchSupervisor,
		supervisorEmail: m.assignmentMatchSupervisorEmail,
		motivation: m.assignmentMatchMotivation,
		experience: m.assignmentMatchExperience,
		note: m.assignmentMatchNote
	};

	const statusColors: Record<DeckStatus, string> = {
		rated: 'bg-success',
		flagged: 'bg-warning',
		disqualified: 'bg-error',
		unrated: 'bg-base-300'
	};
</script>

{#if results.length}
	<div class="flex flex-col gap-2">
		<span class="text-base-content/60 text-sm" data-testid="search-count">
			{m.assignmentSearchResults({ shown: results.length, total })}
		</span>
		<ul class="flex flex-col gap-2">
			{#each results as entry (entry.id)}
				<li>
					<button
						class="card bg-base-100 border-base-200 hover:border-primary flex w-full cursor-pointer flex-row items-center gap-3 border p-3 text-left shadow-sm transition-colors"
						onclick={() => onSelect(entry.id)}
					>
						<span class="h-10 w-1.5 shrink-0 rounded-sm {statusColors[entry.status]}"></span>
						<i class="fa-duotone {entry.kind === 'delegation' ? 'fa-users' : 'fa-user'} text-lg"
						></i>
						<span class="flex min-w-0 flex-1 flex-col gap-1">
							<span class="font-bold">{entry.codename}</span>
							<span class="text-base-content/50 font-mono text-xs">{entry.id}</span>
							<span class="flex flex-col gap-0.5 text-xs">
								{#each matchReasons(entry, search) as reason (reason.kind + reason.value)}
									{@const snippet = snippetOf(reason)}
									<span class="flex min-w-0 gap-2">
										<span class="text-base-content/60 shrink-0 font-semibold">
											{reasonLabels[reason.kind]()}
										</span>
										<span class="truncate">
											{snippet.before}<mark class="bg-warning/40 rounded-sm">{snippet.hit}</mark
											>{snippet.after}
										</span>
									</span>
								{/each}
							</span>
						</span>
						<span class="text-base-content/70 shrink-0 truncate text-sm">
							{entry.school ?? m.assignmentNoSchool()}
						</span>
						<span class="badge badge-ghost">{entry.size}</span>
					</button>
				</li>
			{/each}
		</ul>
	</div>
{:else}
	<div class="text-base-content/60 flex flex-col items-center py-12 text-center">
		<i class="fa-duotone fa-magnifying-glass mb-4 text-4xl opacity-30"></i>
		<p>{m.assignmentNoApplications()}</p>
	</div>
{/if}
