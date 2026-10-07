<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const steps = $derived(
		(
			[
				['sighting', m.assignmentTabSighting(), 'eye', m.assignmentIntroSightingText()],
				[
					'weighting',
					m.assignmentTabWeighting(),
					'scale-balanced',
					m.assignmentIntroWeightingText()
				],
				['singles', m.assignmentTabSingles(), 'user-tie', m.assignmentIntroSinglesText()],
				['delegations', m.assignmentTabDelegations(), 'split', m.assignmentIntroDelegationsText()],
				['finish', m.assignmentTabFinish(), 'flag-checkered', m.assignmentIntroFinishText()]
			] as const
		).map(([id, title, icon, text]) => ({
			id,
			title,
			icon,
			text,
			href: resolve(`/(authenticated)/dashboard/[conferenceId]/management/assignment/${id}`, {
				conferenceId: params.conferenceId
			})
		}))
	);

	const phases = $derived([
		['pen-ruler', m.assignmentIntroDraftTitle(), m.assignmentIntroDraftText()],
		['file-import', m.assignmentIntroApplyTitle(), m.assignmentIntroApplyText()],
		['eye', m.assignmentIntroReleaseTitle(), m.assignmentIntroReleaseText()]
	] as const);
</script>

<div class="flex max-w-4xl flex-col gap-8">
	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-bold">{m.assignmentIntroTitle()}</h3>
		<p class="text-base-content/80">{m.assignmentIntroLead()}</p>
	</div>

	<section class="flex flex-col gap-4">
		<h4 class="text-lg font-semibold">{m.assignmentIntroPhasesTitle()}</h4>
		<ol class="grid gap-x-8 gap-y-4 md:grid-cols-3">
			{#each phases as [icon, title, text], index (title)}
				<li class="flex flex-col gap-1">
					<span class="flex items-center gap-2 font-semibold">
						<i class="fa-duotone fa-{icon} text-primary"></i>
						{index + 1}. {title}
					</span>
					<span class="text-base-content/70 text-sm">{text}</span>
				</li>
			{/each}
		</ol>
	</section>

	<section class="flex flex-col gap-4">
		<h4 class="text-lg font-semibold">{m.assignmentIntroStepsTitle()}</h4>
		<ol class="flex flex-col gap-5">
			{#each steps as step, index (step.id)}
				<li class="flex gap-4">
					<span class="text-base-content/40 w-6 text-right text-2xl font-bold tabular-nums">
						{index + 1}
					</span>
					<div class="flex flex-col gap-1">
						<a
							class="link link-hover flex cursor-pointer items-center gap-2 font-semibold"
							href={step.href}
						>
							<i class="fa-duotone fa-{step.icon} text-primary"></i>
							{step.title}
						</a>
						<p class="text-base-content/80">{step.text}</p>
					</div>
				</li>
			{/each}
		</ol>
	</section>
</div>
