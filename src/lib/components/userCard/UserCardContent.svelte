<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import UserCardBody from './UserCardBody.svelte';
	import type { UserCardTab } from './UserCardTabs.svelte';

	interface Props {
		userId: string;
		conferenceId: string;
		mode: 'drawer' | 'page';
	}

	let { userId, conferenceId, mode }: Props = $props();

	// Kept out here so the card stays on the same tab when it is pointed at someone else.
	let activeTab = $state<UserCardTab>('userData');
</script>

<!-- Keyed so pointing the card at someone else shows the skeleton instead of the previous person. -->
{#key `${conferenceId}:${userId}`}
	<svelte:boundary onerror={(error) => console.error('Failed to load user card data:', error)}>
		<UserCardBody {userId} {conferenceId} {mode} bind:activeTab />

		{#snippet pending()}
			<div class="flex h-full flex-col">
				<div class="flex items-center gap-3 px-5 pt-3 pb-2 md:px-10 lg:px-16">
					<div
						class="flex flex-1 flex-col gap-0.5 border border-base-300 bg-base-200 rounded-box p-4"
					>
						<div class="flex flex-wrap items-center gap-4">
							<div class="skeleton h-9 w-64"></div>
							<div class="skeleton h-4 w-4 rounded-full"></div>
							<div class="skeleton h-3 w-14 rounded-full"></div>
							<div class="ml-auto flex items-center gap-1">
								<div class="skeleton h-8 w-8 rounded-field"></div>
								<div class="skeleton h-8 w-8 rounded-field"></div>
								<div class="skeleton h-8 w-8 rounded-field"></div>
								{#if mode === 'drawer'}
									<div class="skeleton h-8 w-8 rounded-field"></div>
								{/if}
							</div>
						</div>
						<div class="skeleton mt-1 h-3 w-44 rounded-full"></div>
						<div class="mt-2 flex items-center gap-2">
							<div class="skeleton h-8 w-12 rounded-field"></div>
							<div class="skeleton h-5 w-8 rounded-full"></div>
						</div>
					</div>
				</div>
				<div class="flex flex-col gap-3 p-5 md:px-10 md:py-6 lg:px-16">
					<div class="skeleton h-24 w-full"></div>
					<div class="skeleton h-24 w-full"></div>
				</div>
			</div>
		{/snippet}

		{#snippet failed()}
			<div class="p-5 md:px-10 lg:px-16">
				<div class="alert alert-error">
					<i class="fa-duotone fa-triangle-exclamation"></i>
					<span>{m.httpGenericError()}</span>
				</div>
			</div>
		{/snippet}
	</svelte:boundary>
{/key}
