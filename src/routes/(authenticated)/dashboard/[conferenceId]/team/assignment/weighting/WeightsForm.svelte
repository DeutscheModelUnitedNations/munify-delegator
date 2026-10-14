<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { DEFAULT_WEIGHTS, assignmentCost } from '$lib/assignment/autoAssign';
	import { weightImpacts, type ImpactEffect, type ImpactTone } from '$lib/assignment/weightImpact';
	import Form from '$lib/components/form/Form.svelte';
	import FormSelect from '$lib/components/form/FormSelect.svelte';
	import FormFieldset from '$lib/components/form/FormFieldset.svelte';
	import FormTextInput from '$lib/components/form/FormTextInput.svelte';
	import { m } from '$lib/paraglide/messages';
	import { assignmentWeightsSchema } from '$lib/schemata/assignmentWeights';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import { toast } from 'svelte-sonner';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { untrack } from 'svelte';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	// Seeded once: re-reading the weights while someone is typing would discard their edits. The
	// page remounts this form per conference, so reading the id untracked is what is meant.
	const stored = (
		await client.query.assignmentWeights({
			__args: { where: { conferenceId: { eq: untrack(() => conferenceId) } } },
			nullRating: true,
			ratingFactor: true,
			markBonus: true,
			markEffect: true,
			experienceModifier: true,
			experienceEffect: true
		})
	).at(0);
	// A missing or unusable stored value falls back to the default, so the form always starts valid
	const orDefault = (value: number | null | undefined, fallback: number) =>
		typeof value === 'number' && Number.isFinite(value) ? value : fallback;
	const initialValues = {
		nullRating: orDefault(stored?.nullRating, DEFAULT_WEIGHTS.nullRating),
		ratingFactor: orDefault(stored?.ratingFactor, DEFAULT_WEIGHTS.ratingFactor),
		markBonus: orDefault(stored?.markBonus, DEFAULT_WEIGHTS.markBonus),
		markEffect: stored?.markEffect ?? DEFAULT_WEIGHTS.markEffect,
		experienceModifier: orDefault(stored?.experienceModifier, DEFAULT_WEIGHTS.experienceModifier),
		experienceEffect: stored?.experienceEffect ?? DEFAULT_WEIGHTS.experienceEffect
	};

	const form = superForm(defaults(initialValues, zod4Client(assignmentWeightsSchema)), {
		SPA: true,
		resetForm: false,
		validationMethod: 'oninput',
		validators: zod4Client(assignmentWeightsSchema),
		onError: (e) => toast.error(e.result.error.message),
		async onUpdate({ form: validated }) {
			if (!validated.valid) return;
			const promise = client.mutate.setAssignmentWeights({
				__args: { conferenceId, ...validated.data },
				nullRating: true
			});
			toast.promise(promise, genericPromiseToastMessages);
			await promise;
		}
	});
	const formData = $derived(form.form);

	// Only fills the fields (and taints the form), so the defaults still have to be saved
	const resetToDefaults = () => form.form.set({ ...DEFAULT_WEIGHTS });

	/** What a few typical applications would cost with the weights as entered. */
	const examples = $derived(
		[
			{
				label: m.assignmentExampleFirstWishGood(),
				review: { evaluation: 5, flagged: false },
				rank: 1
			},
			{ label: m.assignmentExampleFirstWishUnrated(), review: undefined, rank: 1 },
			{
				label: m.assignmentExampleFirstWishExperienced(),
				review: undefined,
				rank: 1,
				experience: 1
			},
			{
				label: m.assignmentExampleThirdWishFlagged(),
				review: { evaluation: null, flagged: true },
				rank: 3
			},
			{
				label: m.assignmentExampleFirstWishPoor(),
				review: { evaluation: 1, flagged: false },
				rank: 1
			}
		].map((example) => ({
			label: example.label,
			cost: assignmentCost(
				$formData,
				example.review && { ...example.review, disqualified: false },
				example.rank,
				example.experience
			)
		}))
	);

	const impacts = $derived(weightImpacts($formData));

	const subjects = {
		ratings: () => m.assignmentImpactSubjectRatings(),
		aboveAverage: (rating = 0) => m.assignmentImpactSubjectAboveAverage({ rating }),
		belowAverage: (rating = 0) => m.assignmentImpactSubjectBelowAverage({ rating }),
		flagged: () => m.assignmentImpactSubjectFlagged(),
		experienced: () => m.assignmentImpactSubjectExperienced(),
		newcomers: () => m.assignmentImpactSubjectNewcomers()
	};
	const effects: Record<ImpactEffect, () => string> = {
		seatedFirst: () => m.assignmentImpactEffectSeatedFirst(),
		leftOutFirst: () => m.assignmentImpactEffectLeftOutFirst(),
		wishesWeighMore: () => m.assignmentImpactEffectWishesWeighMore(),
		wishesWeighLess: () => m.assignmentImpactEffectWishesWeighLess(),
		winContested: () => m.assignmentImpactEffectWinContested(),
		loseContested: () => m.assignmentImpactEffectLoseContested(),
		noEffect: () => m.assignmentImpactEffectNoEffect(),
		noRoleEffect: () => m.assignmentImpactEffectNoRoleEffect()
	};
	const toneClass: Record<ImpactTone, string> = {
		good: 'text-success',
		bad: 'text-error',
		neutral: 'text-base-content/60'
	};
</script>

{#snippet nullRating()}<i class="fa-sharp-duotone fa-solid fa-star text-warning"></i>{/snippet}
{#snippet ratingFactor()}<i class="fa-sharp-duotone fa-solid fa-star-half-stroke text-warning"
	></i>{/snippet}
{#snippet experienceModifier()}<i class="fa-sharp-duotone fa-solid fa-user-clock text-warning"
	></i>{/snippet}
{#snippet markBonus()}<i class="fa-sharp-duotone fa-solid fa-flag text-warning"></i>{/snippet}

<div class="flex flex-col gap-6 lg:flex-row">
	<div class="flex grow flex-col gap-4">
		<div class="alert alert-info alert-soft">
			<i class="fa-sharp-duotone fa-solid fa-scale-balanced text-xl"></i>
			<p>{m.assignmentWeightingHint()}</p>
		</div>
		<!-- The descriptions here are long, so they get the full width instead of the default 50ch -->
		<div class="[&_.label-text]:max-w-none">
			<Form {form}>
				<FormFieldset title={m.assignmentWeightsRating()}>
					{#snippet icon()}<i class="fa-sharp-duotone fa-solid fa-star text-warning"></i>{/snippet}
					<!-- Each field spans the same four rows (label, description, input, errors) so the inputs stay level -->
					<div
						class="grid grid-cols-1 gap-x-4 md:grid-cols-2 md:grid-rows-[auto_1fr_auto_auto] md:[&>div]:row-span-4 md:[&>div]:grid md:[&>div]:grid-rows-subgrid"
					>
						<FormTextInput
							{form}
							name="nullRating"
							labelIcon={nullRating}
							placeholder={String(DEFAULT_WEIGHTS.nullRating)}
							type="number"
							step="any"
							label={m.assignmentNullRating()}
							description={m.assignmentNullRatingDescription()}
						/>
						<FormTextInput
							{form}
							name="ratingFactor"
							labelIcon={ratingFactor}
							placeholder={String(DEFAULT_WEIGHTS.ratingFactor)}
							type="number"
							step="any"
							label={m.assignmentRatingFactor()}
							description={m.assignmentRatingFactorDescription()}
						/>
					</div>
				</FormFieldset>
				<FormFieldset title={m.assignmentWeightsWishes()}>
					{#snippet icon()}<i class="fa-sharp-duotone fa-solid fa-flag text-warning"></i>{/snippet}
					<div
						class="grid grid-cols-1 gap-x-4 md:grid-cols-2 md:grid-rows-[auto_1fr_auto_auto] md:[&>div]:row-span-4 md:[&>div]:grid md:[&>div]:grid-rows-subgrid"
					>
						<FormTextInput
							{form}
							name="markBonus"
							labelIcon={markBonus}
							placeholder={String(DEFAULT_WEIGHTS.markBonus)}
							type="number"
							step="any"
							label={m.assignmentMarkBonus()}
							description={m.assignmentMarkBonusDescription()}
						/>
						<FormSelect
							{form}
							name="markEffect"
							label={m.assignmentMarkEffect()}
							description={m.assignmentMarkEffectDescription()}
							options={[
								{
									value: 'WISHES_AND_SEATING',
									label: m.assignmentExperienceEffectWishesAndSeating()
								},
								{ value: 'SEATING_ONLY', label: m.assignmentExperienceEffectSeatingOnly() }
							]}
						/>
					</div>
				</FormFieldset>
				<FormFieldset title={m.assignmentWeightsExperience()}>
					{#snippet icon()}<i class="fa-sharp-duotone fa-solid fa-user-clock text-warning"
						></i>{/snippet}
					<div
						class="grid grid-cols-1 gap-x-4 md:grid-cols-2 md:grid-rows-[auto_1fr_auto_auto] md:[&>div]:row-span-4 md:[&>div]:grid md:[&>div]:grid-rows-subgrid"
					>
						<FormTextInput
							{form}
							name="experienceModifier"
							labelIcon={experienceModifier}
							placeholder={String(DEFAULT_WEIGHTS.experienceModifier)}
							type="number"
							step="any"
							label={m.assignmentExperienceModifier()}
							description={m.assignmentExperienceModifierDescription()}
						/>
						<FormSelect
							{form}
							name="experienceEffect"
							label={m.assignmentExperienceEffect()}
							description={m.assignmentExperienceEffectDescription()}
							options={[
								{
									value: 'WISHES_AND_SEATING',
									label: m.assignmentExperienceEffectWishesAndSeating()
								},
								{ value: 'SEATING_ONLY', label: m.assignmentExperienceEffectSeatingOnly() }
							]}
						/>
					</div>
				</FormFieldset>
			</Form>
		</div>
	</div>
	<aside class="flex shrink-0 flex-col gap-4 lg:w-96">
		<div class="card bg-base-100 border-base-200 border shadow-sm">
			<div class="card-body">
				<h3 class="card-title text-base">{m.assignmentCostExamples()}</h3>
				<p class="text-base-content/60 text-sm">{m.assignmentCostExamplesDescription()}</p>
				<table class="table-sm table">
					<tbody>
						{#each examples as example (example.label)}
							<tr>
								<td>{example.label}</td>
								<td class="text-right font-mono">{example.cost.toFixed(1)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
		<div class="card bg-base-100 border-base-200 border shadow-sm">
			<div class="card-body">
				<h3 class="card-title text-base">{m.assignmentImpactTitle()}</h3>
				<p class="text-base-content/60 text-sm">{m.assignmentImpactDescription()}</p>
				<ul class="flex flex-col gap-3 text-sm">
					{#each impacts as impact (impact.subject)}
						<li>
							<span class="font-semibold">{subjects[impact.subject](impact.rating)}</span>
							{#each impact.effects as effect, index (effect.effect)}
								<span class={toneClass[effect.tone]}
									>{index > 0 ? ' · ' : ': '}{effects[effect.effect]()}</span
								>
							{/each}
						</li>
					{/each}
				</ul>
			</div>
		</div>
		<button type="button" class="btn btn-ghost self-end" onclick={resetToDefaults}>
			<i class="fa-sharp-duotone fa-solid fa-rotate-left"></i>
			{m.assignmentWeightsReset()}
		</button>
	</aside>
</div>
