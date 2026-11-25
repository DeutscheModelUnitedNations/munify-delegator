<script lang="ts">
	import IconPicker from '#lib/components/IconPicker.svelte';
	import { m } from '#lib/paraglide/messages';
	import { CALLOUT_COLORS } from '#lib/guide/blocks';

	/** The toolbar's icon picker and colour menu for the callout around the cursor. */
	interface Props {
		icon: string;
		color: (typeof CALLOUT_COLORS)[number];
		onChange: (attrs: { icon?: string; color?: string }) => void;
	}

	let { icon, color, onChange }: Props = $props();

	const LABELS: Record<(typeof CALLOUT_COLORS)[number], () => string> = {
		info: m.guideCalloutColorInfo,
		success: m.guideCalloutColorSuccess,
		warning: m.guideCalloutColorWarning,
		error: m.guideCalloutColorError,
		neutral: m.guideCalloutColorNeutral
	};

	let menu = $state<HTMLDetailsElement>();
</script>

<li class="md:tooltip" data-tip={m.guideEditorCalloutIcon()}>
	<IconPicker value={icon} triggerClass="" onchange={(picked) => onChange({ icon: picked })} />
</li>
<li>
	<details class="dropdown" bind:this={menu}>
		<summary aria-label={m.guideEditorCalloutColor()}>
			<i class="ph-duotone ph-palette" aria-hidden="true"></i>
		</summary>
		<ul class="dropdown-content menu bg-base-100 rounded-box z-20 w-48 p-2 shadow">
			{#each CALLOUT_COLORS as option (option)}
				<li>
					<button
						type="button"
						aria-pressed={color === option}
						onclick={() => {
							onChange({ color: option });
							menu?.removeAttribute('open');
						}}
					>
						<span
							class="guide-callout-swatch"
							style:background="var(--color-{option === 'neutral' ? 'base-300' : option})"
							aria-hidden="true"
						></span>
						{LABELS[option]()}
					</button>
				</li>
			{/each}
		</ul>
	</details>
</li>
