<script lang="ts">
	import { logger } from '#lib/logger';
	import UserCardBody from './UserCardBody.svelte';
	import LoadError from '#lib/components/LoadError.svelte';
	import type { UserCardTab } from './userCardTabs';

	interface Props {
		userId: string;
		conferenceId: string;
		mode: 'drawer' | 'page';
	}

	let { userId, conferenceId, mode }: Props = $props();

	// Kept out here so the card stays on the same tab when it is pointed at someone else. Null until
	// one is picked, so the first card opens where the conference's state suggests.
	let activeTab = $state<UserCardTab | null>(null);
</script>

<!-- Keyed so pointing the card at someone else shows the skeleton instead of the previous person. -->
{#key `${conferenceId}:${userId}`}
	<svelte:boundary onerror={(error) => logger.error('Failed to load user card data', error)}>
		<UserCardBody {userId} {conferenceId} {mode} bind:activeTab />

		{#snippet pending()}
			<div class="flex h-full flex-col">
				<!-- The header's layout (UserCardHeader), so nothing jumps when the data arrives -->
				<div
					class="flex items-center gap-3 px-3 pt-2 pb-1 sm:px-5 sm:pt-3 sm:pb-2 md:px-10 lg:px-16"
				>
					<div
						class="border-base-300 bg-base-200 rounded-box flex min-w-0 flex-1 flex-col gap-2 border p-2.5 sm:gap-3 sm:p-4"
					>
						<div
							class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start sm:gap-y-1.5"
						>
							<div
								class="skeleton hidden h-14 w-14 rounded-full sm:col-start-1 sm:row-span-3 sm:row-start-1 sm:block"
							></div>
							<div
								class="col-span-2 col-start-1 row-start-1 flex items-center gap-3 sm:col-span-1 sm:col-start-2 {mode ===
								'drawer'
									? 'max-sm:pr-8'
									: ''}"
							>
								<div class="skeleton h-7 w-52 max-w-full sm:h-9 sm:w-64"></div>
								<div class="skeleton h-4 w-4 shrink-0 rounded-full"></div>
								<div class="skeleton h-5 w-20 shrink-0 rounded-full"></div>
							</div>
							<div class="col-start-1 row-start-2 sm:col-start-2">
								<div class="skeleton h-4 w-36 rounded-full"></div>
							</div>
							<div
								class="col-span-2 col-start-1 row-start-3 flex flex-wrap gap-x-3 gap-y-1 sm:col-span-1 sm:col-start-2"
							>
								<div class="skeleton h-4 w-48 rounded-full"></div>
								<div class="skeleton h-4 w-32 rounded-full"></div>
							</div>
							<div
								class="col-start-2 row-start-2 flex items-center gap-1 sm:col-start-3 sm:row-start-1"
							>
								<div class="skeleton rounded-box h-8 w-8"></div>
								<div class="skeleton rounded-box h-8 w-8"></div>
								{#if mode === 'drawer'}
									<div class="skeleton rounded-box h-8 w-8"></div>
								{/if}
							</div>
						</div>
						<div
							class="border-base-content/10 flex gap-2 overflow-hidden border-t pt-1.5 sm:flex-wrap sm:pt-2"
						>
							{#each [20, 24, 28, 20, 24] as width, i (i)}
								<div class="skeleton h-4 shrink-0 rounded-full" style:width="{width * 4}px"></div>
							{/each}
						</div>
					</div>
				</div>
				<div class="flex gap-4 px-3 py-2 sm:px-5 md:px-10 lg:px-16">
					{#each Array.from({ length: 5 }, (_, i) => i) as i (i)}
						<div class="skeleton h-5 w-5 rounded-full sm:w-20"></div>
					{/each}
				</div>
				<div class="flex flex-col gap-3 p-3 sm:p-5 md:px-10 md:py-6 lg:px-16">
					<div class="skeleton h-24 w-full"></div>
					<div class="skeleton h-24 w-full"></div>
				</div>
			</div>
		{/snippet}

		{#snippet failed(_error, reset)}
			<div class="p-5 md:px-10 lg:px-16">
				<LoadError onretry={reset} />
			</div>
		{/snippet}
	</svelte:boundary>
{/key}
