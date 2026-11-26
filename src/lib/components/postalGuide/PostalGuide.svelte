<!--
	@component
	How to send the postal documents so they can be processed: one step after the other, each a
	looping animation of the mistake and the right way. Other guides (the payment guide) pass their own
	`steps`, end picture and texts and share the frame. The bar at the bottom fills while a step plays; only
	then the next one opens, unless the guide was watched to its end before (`progress`).
-->
<script lang="ts">
	import { tick, type Component, type ComponentProps } from 'svelte';
	import { fly } from 'svelte/transition';
	import { prefersReducedMotion } from 'svelte/motion';
	import { m } from '#lib/paraglide/messages';
	import GuideClosing from './GuideClosing.svelte';
	import GuideFooter from './GuideFooter.svelte';
	import GuideWarning from './GuideWarning.svelte';
	import type { GuideProgress } from './guideProgress.svelte.js';
	import Finale from './scenes/Finale.svelte';
	import ScenePlaceholder from './ScenePlaceholder.svelte';
	import { GUIDE_STEPS, type GuideStep } from './steps';

	type FooterProps = ComponentProps<typeof GuideFooter>;

	interface Props {
		progress: GuideProgress;
		/** It was watched to its end. */
		onComplete: () => void;
		/** The end's button, for what comes next. */
		finish: FooterProps['finish'];
		/** Only where the guide may be skipped. */
		onSkip?: () => void;
		/** Only where the guide may be left before its end. */
		onLeave?: () => void;
		/** The guide's steps; the postal guide's by default. */
		steps?: readonly GuideStep[];
		/** The picture at the end. */
		finale?: Component;
		/** The heading at the end, above the list of what was shown. */
		doneTitle?: string;
		/** Highlighted under that list. */
		closingWarning?: string;
	}

	let {
		progress,
		onComplete,
		finish,
		onSkip,
		onLeave,
		steps = GUIDE_STEPS,
		finale: FinaleScene = Finale,
		doneTitle = m.postalGuideDoneTitle(),
		closingWarning = m.postalGuideWarning()
	}: Props = $props();

	const step = $derived(steps.at(progress.index));

	let guide = $state<HTMLElement>();
	/** The scenes loop until they are held, which also holds the ones after. */
	let paused = $state(false);
	let direction = $state(1);

	// Counts frames while the step has to be watched; frames stop in a background tab
	$effect(() => {
		if (progress.ready || progress.done) return;
		let last = performance.now();
		let frame = requestAnimationFrame(function count(now) {
			progress.tick(now - last);
			last = now;
			frame = requestAnimationFrame(count);
		});
		return () => cancelAnimationFrame(frame);
	});

	function next() {
		direction = 1;
		progress.next();
		showScene();
		if (progress.done) onComplete();
	}

	function back() {
		direction = -1;
		progress.back();
		showScene();
	}

	/** On a phone the buttons are below the scene, which would play out of sight. */
	function showScene() {
		guide?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
	}

	/** The button that led here may be gone or locked now, so the step's title takes the focus. */
	function focusTitle(heading: HTMLElement) {
		// once a dialog around it has noted what to give the focus back to
		void tick().then(() => heading.focus({ preventScroll: true }));
	}
</script>

{#snippet stage()}
	<div
		class="bg-base-200 relative mx-auto max-w-xl overflow-hidden rounded-box"
		data-paused={paused}
	>
		{#if step?.scene}
			<step.scene />
		{:else if step}
			<ScenePlaceholder icon={step.icon ?? 'info'} />
		{:else}
			<FinaleScene />
		{/if}
		<!-- Without motion there is nothing to hold -->
		<button
			type="button"
			class="btn btn-circle btn-ghost btn-sm absolute top-2 right-2 motion-reduce:hidden"
			aria-label={paused ? m.postalGuidePlay() : m.postalGuidePause()}
			title={paused ? m.postalGuidePlay() : m.postalGuidePause()}
			onclick={() => (paused = !paused)}
		>
			<i aria-hidden="true" class="ph-fill text-lg {paused ? 'ph-play' : 'ph-pause'}"></i>
		</button>
	</div>
{/snippet}

{#snippet explanation()}
	<!-- The longest text's height, so the buttons stay where they are -->
	<div class="mx-auto mt-4 max-w-xl text-center" class:min-h-40={step}>
		<h3 class="text-2xl font-bold outline-none" tabindex="-1" {@attach focusTitle}>
			{step ? step.title() : doneTitle}
		</h3>
		{#if step}
			<div class="mt-2 flex items-center justify-center gap-2 sm:gap-4">
				{#if step.important}
					<span aria-hidden="true" class="text-error text-8xl leading-none font-black">!</span>
				{/if}
				<p>{step.text()}</p>
			</div>
			{#if step.warning}
				<GuideWarning text={step.warning()} />
			{/if}
		{:else}
			<GuideClosing {steps} warning={closingWarning} />
		{/if}
	</div>
{/snippet}

<div class="scroll-mt-24" bind:this={guide}>
	<div class="overflow-hidden">
		{#key progress.index}
			<div in:fly={{ x: prefersReducedMotion.current ? 0 : 60 * direction, duration: 250 }}>
				{@render stage()}
				{@render explanation()}
			</div>
		{/key}
	</div>

	<!-- Announced once the next step opens, which the bar only shows -->
	<p class="sr-only" role="status">
		{progress.ready && !onSkip ? m.postalGuideReady() : ''}
	</p>

	<div class="mt-6">
		<GuideFooter
			{progress}
			count={steps.length}
			onNext={next}
			onBack={back}
			{finish}
			{onSkip}
			{onLeave}
		/>
	</div>
</div>
