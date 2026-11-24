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
			<!-- The side column's and the tabs' layout (UserCardBody), so nothing jumps when the data arrives -->
			<div
				class="flex min-h-0 flex-1 flex-col {mode === 'drawer'
					? 'overflow-hidden lg:flex-row'
					: 'xl:flex-row xl:items-start xl:gap-2'}"
			>
				<div
					class="bg-base-200 flex shrink-0 flex-col gap-3 p-4 {mode === 'drawer'
						? 'lg:w-80'
						: 'xl:w-80'}"
				>
					<div class="skeleton h-8 w-52 max-w-full"></div>
					<div class="flex gap-2">
						<div class="skeleton h-5 w-28 rounded-full"></div>
						<div class="skeleton h-5 w-20 rounded-full"></div>
					</div>
					<div class="skeleton h-4 w-36 rounded-full"></div>
					<div class="flex gap-1">
						<div class="skeleton rounded-box h-8 w-8"></div>
						<div class="skeleton rounded-box h-8 w-8"></div>
					</div>
					{#each Array.from({ length: 8 }, (_, i) => i) as i (i)}
						<div class="flex gap-3">
							<div class="skeleton h-4 w-20 rounded-full"></div>
							<div class="skeleton h-4 flex-1 rounded-full"></div>
						</div>
					{/each}
				</div>
				<div class="flex min-w-0 flex-1 flex-col">
					<div class="flex gap-4 px-3 py-4 sm:px-5">
						{#each Array.from({ length: 5 }, (_, i) => i) as i (i)}
							<div class="skeleton h-5 w-5 rounded-full sm:w-20"></div>
						{/each}
					</div>
					<div class="flex flex-col gap-3 p-3 sm:p-5">
						<div class="skeleton h-24 w-full"></div>
						<div class="skeleton h-24 w-full"></div>
					</div>
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
