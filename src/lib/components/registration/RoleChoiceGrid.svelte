<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';

	/** The roles of a conference single participants apply for, as cards to choose one from. */
	interface Props {
		conferenceId: string;
		/** Roles not to offer, such as those already applied for. */
		excludeIds?: string[];
		actionLabel: string;
		onChoose: (role: { id: string; name: string }) => void | Promise<void>;
	}

	let { conferenceId, excludeIds = [], actionLabel, onChoose }: Props = $props();

	const roles = $derived(
		await client.liveQuery.conferenceRoles({
			__args: { where: { conferenceId: { eq: conferenceId }, kind: 'CUSTOM' } },
			id: true,
			name: true,
			description: true,
			fontAwesomeIcon: true
		})
	);
	const offered = $derived(roles.filter((role) => !excludeIds.includes(role.id)));

	let choosing = $state<string>();

	async function choose(role: { id: string; name: string | null }) {
		choosing = role.id;
		try {
			await onChoose({ id: role.id, name: role.name ?? '' });
		} finally {
			choosing = undefined;
		}
	}
</script>

<div class="grid gap-3 md:grid-cols-2">
	{#each offered as role (role.id)}
		<div class="card bg-base-200 hover:bg-primary/10 transition-colors duration-200">
			<div class="flex items-center gap-4 p-4">
				<span
					class="bg-primary/10 text-primary rounded-box flex size-10 shrink-0 items-center justify-center text-lg"
				>
					<i
						class="fa-sharp-duotone fa-solid fa-{(role.fontAwesomeIcon || 'user-tie').replace(
							/^fa-/,
							''
						)}"
					></i>
				</span>
				<span class="flex min-w-0 flex-1 flex-col">
					<span class="font-semibold">{role.name}</span>
					<span class="text-base-content/70 text-sm">{role.description}</span>
				</span>
				<button
					class="btn btn-primary btn-sm shrink-0"
					type="button"
					disabled={choosing !== undefined}
					aria-label={actionLabel}
					onclick={() => choose(role)}
				>
					{#if choosing === role.id}
						<span class="loading loading-spinner loading-xs"></span>
					{/if}
					<span class="max-sm:hidden">{actionLabel}</span>
					<i class="fa-sharp-duotone fa-solid fa-arrow-right"></i>
				</button>
			</div>
		</div>
	{/each}
</div>
