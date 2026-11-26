<!-- The postal guide's progress bar and buttons. -->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import GuideStepButtons from './GuideStepButtons.svelte';
	import type { GuideProgress } from './guideProgress.svelte.js';

	interface Props {
		progress: GuideProgress;
		/** How many steps the guide has. */
		count: number;
		onNext: () => void;
		onBack: () => void;
		/** The end's button, for what comes next. */
		finish: { label: string; icon: string; onclick: () => void };
		/** Only where the guide may be skipped. */
		onSkip?: () => void;
		/** Only where the guide may be left before its end. */
		onLeave?: () => void;
	}

	let { progress, count, onNext, onBack, finish, onSkip, onLeave }: Props = $props();
</script>

<div class="flex w-full flex-col gap-4">
	<div class="flex items-center gap-1" aria-hidden="true">
		{#each { length: count }, index (index)}
			<div class="bg-base-300 h-2 flex-1 overflow-hidden rounded-full">
				<div
					class="bg-primary h-full origin-left rounded-full"
					style:transform="scaleX({progress.fill(index)})"
				></div>
			</div>
		{/each}
	</div>
	<div class="flex flex-wrap items-center gap-2">
		{#if progress.index > 0}
			<button type="button" class="btn btn-ghost" onclick={onBack}>{m.back()}</button>
		{:else if onLeave}
			<button type="button" class="btn btn-ghost" onclick={onLeave}>{m.postalGuideLater()}</button>
		{/if}
		{#if !progress.done}
			<span class="text-base-content/60 text-sm max-sm:sr-only">
				{m.postalGuideStep({ current: progress.index + 1, total: count })}
			</span>
		{/if}
		<div class="ml-auto flex flex-wrap gap-2">
			{#if progress.done}
				<button type="button" class="btn btn-primary" onclick={finish.onclick}>
					{finish.label}
					<i aria-hidden="true" class="ph-fill ph-{finish.icon}"></i>
				</button>
			{:else}
				<GuideStepButtons ready={progress.ready} {onNext} {onSkip} />
			{/if}
		</div>
	</div>
</div>
