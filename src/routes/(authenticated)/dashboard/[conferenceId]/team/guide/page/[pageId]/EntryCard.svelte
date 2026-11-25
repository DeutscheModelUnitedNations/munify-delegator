<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { Audience } from '#lib/guide/outline';
	import AudienceSelect from '../../AudienceSelect.svelte';

	/** One place of the page in the sidebar: the section, its own title there and who sees it. */
	interface Props {
		section: string;
		label: string | undefined;
		audience: Audience | undefined;
		roles: readonly { id: string; name: string }[];
		onLabel: (label: string | undefined) => void;
		onAudience: (audience: Audience | undefined) => void;
		onRemove: () => void;
	}

	let { section, label, audience, roles, onLabel, onAudience, onRemove }: Props = $props();
</script>

<div class="bg-base-200 rounded-box flex flex-col gap-2 p-3" data-testid="guide-page-entry">
	<div class="flex items-center gap-2 text-sm font-semibold">
		<i class="ph-duotone ph-list-bullets" aria-hidden="true"></i>
		<span class="min-w-0 flex-1">{section}</span>
		<button
			class="btn btn-ghost btn-xs btn-square"
			aria-label={m.guideRemoveEntry()}
			onclick={onRemove}
		>
			<i class="ph-duotone ph-x" aria-hidden="true"></i>
		</button>
	</div>
	<input
		class="input input-sm w-full"
		placeholder={m.guideEntryLabel()}
		aria-label={m.guideEntryLabel()}
		value={label ?? ''}
		maxlength="200"
		onchange={(event) => onLabel(event.currentTarget.value.trim() || undefined)}
	/>
	<AudienceSelect
		value={audience}
		{roles}
		optional
		label={m.guideEntryAudience()}
		onChange={onAudience}
	/>
</div>
