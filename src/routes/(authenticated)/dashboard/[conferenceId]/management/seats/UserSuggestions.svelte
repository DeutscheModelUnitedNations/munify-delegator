<script lang="ts">
	import type { UserPreview } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import formatNames from '$lib/helpers/formatNames';

	interface Props {
		suggestions: UserPreview[];
		/** Ids of the suggested users who already hold some part in the conference */
		inConference: ReadonlySet<string>;
		selectedId?: string;
		onSelect: (suggestion: UserPreview) => void;
	}

	let { suggestions, inConference, selectedId, onSelect }: Props = $props();
</script>

{#if suggestions.length > 0}
	<ul class="menu bg-base-200 w-full rounded-box p-1">
		{#each suggestions as suggestion (suggestion.id)}
			<li>
				<button
					type="button"
					class={selectedId === suggestion.id ? 'menu-active' : ''}
					onclick={() => onSelect(suggestion)}
				>
					<span class="font-semibold">
						{formatNames(suggestion.given_name ?? undefined, suggestion.family_name ?? undefined)}
					</span>
					<span class="text-base-content/60 text-xs">{suggestion.email}</span>
					{#if inConference.has(suggestion.id)}
						<span class="badge badge-warning badge-xs ml-auto">
							<i class="fa-sharp-duotone fa-solid fa-circle-check"></i>
							{m.alreadyInConference()}
						</span>
					{/if}
				</button>
			</li>
		{/each}
	</ul>
{/if}
