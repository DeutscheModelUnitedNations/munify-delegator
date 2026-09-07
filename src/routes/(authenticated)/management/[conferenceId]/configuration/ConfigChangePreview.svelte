<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { groupConfigChanges, type ConfigChange } from './changePreview';

	interface Props {
		changes: ConfigChange[];
	}

	let { changes }: Props = $props();
	let groups = $derived(groupConfigChanges(changes));
</script>

{#if changes.length === 0}
	<p class="py-4">{m.configChangeNoChanges()}</p>
{:else}
	<p class="mb-4">
		{m.configChangeSummary({ count: changes.length })}
	</p>

	<div class="max-h-[50vh] overflow-y-auto pr-1">
		{#each groups as group (group.key)}
			<div class="mb-4 last:mb-0">
				<h3 class="text-base-content/60 mb-2 text-xs font-bold tracking-wide uppercase">
					{group.label}
				</h3>
				<ul class="flex flex-col gap-2">
					{#each group.changes as change (change.key)}
						<li
							class="rounded-lg border p-3 {change.highImpact
								? 'border-warning/50 bg-warning/10'
								: 'border-base-300 bg-base-200'}"
						>
							<div class="flex items-start gap-2">
								{#if change.highImpact}
									<i class="fas fa-triangle-exclamation text-warning mt-1 shrink-0"></i>
								{/if}
								<div class="flex min-w-0 flex-1 flex-col gap-1">
									<span class="text-sm font-medium break-words">{change.label}</span>
									<div class="flex flex-wrap items-center gap-2 text-sm">
										<span class="text-base-content/50 line-through break-all">
											{change.before}
										</span>
										<i class="fas fa-arrow-right text-base-content/40 text-xs"></i>
										<span class="font-semibold break-all">{change.after}</span>
									</div>
									{#if change.isFile}
										<span class="text-base-content/60 text-xs">
											{m.configChangeFileReplaced()}
										</span>
									{/if}
									{#if change.highImpact && change.note}
										<span class="text-base-content/70 text-xs break-words">{change.note}</span>
									{/if}
								</div>
							</div>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</div>
{/if}
