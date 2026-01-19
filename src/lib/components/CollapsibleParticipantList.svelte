<script lang="ts">
	import formatNames from '$lib/services/formatNames';

	interface Props {
		title: string;
		description?: string;
		count: number;
		limit?: number;
		participants: { id: string; given_name: string; family_name: string }[];
		conferenceId: string;
		defaultExpanded?: boolean;
	}

	let {
		title,
		description,
		count,
		limit = 0,
		participants,
		conferenceId,
		defaultExpanded = false
	}: Props = $props();
</script>

<div class="collapse collapse-arrow bg-base-200 rounded-lg">
	<input type="checkbox" checked={defaultExpanded} />
	<div class="collapse-title">
		<div class="flex items-center gap-2">
			<span class="font-semibold">{title}</span>
			<span class="badge badge-sm">
				{count}{#if limit > 0}&nbsp;/&nbsp;{limit}{/if}
			</span>
		</div>
		{#if description}
			<p class="text-sm opacity-70 mt-1">{description}</p>
		{/if}
	</div>
	<div class="collapse-content">
		{#if participants.length > 0}
			<div class="columns-1 sm:columns-2 md:columns-3 xl:columns-4 gap-2 pt-2">
				{#each participants as user}
					<p>
						<a
							href="/management/{conferenceId}/participants?selected={user.id}"
							class="hover:underline"
						>
							{formatNames(user.given_name, user.family_name)}
						</a>
					</p>
				{/each}
			</div>
		{:else}
			<p class="text-sm opacity-50 pt-2">—</p>
		{/if}
	</div>
</div>
