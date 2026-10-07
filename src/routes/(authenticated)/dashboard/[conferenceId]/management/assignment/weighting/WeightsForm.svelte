<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { DEFAULT_WEIGHTS, assignmentCost } from '$lib/assignment/autoAssign';
	import Form from '$lib/components/form/Form.svelte';
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
			nonWishMalus: true
		})
	).at(0);
	const initialValues = {
		nullRating: stored?.nullRating ?? DEFAULT_WEIGHTS.nullRating,
		ratingFactor: stored?.ratingFactor ?? DEFAULT_WEIGHTS.ratingFactor,
		markBonus: stored?.markBonus ?? DEFAULT_WEIGHTS.markBonus,
		nonWishMalus: stored?.nonWishMalus ?? DEFAULT_WEIGHTS.nonWishMalus
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
				label: m.assignmentExampleThirdWishFlagged(),
				review: { evaluation: null, flagged: true },
				rank: 3
			},
			{
				label: m.assignmentExampleFirstWishPoor(),
				review: { evaluation: 1, flagged: false },
				rank: 1
			},
			{ label: m.assignmentExampleNoWish(), review: undefined, rank: undefined }
		].map((example) => ({
			label: example.label,
			cost: assignmentCost(
				$formData,
				example.review && { ...example.review, disqualified: false },
				example.rank
			)
		}))
	);
</script>

<div class="flex flex-col gap-6 lg:flex-row">
	<div class="flex grow flex-col gap-4">
		<div class="alert alert-info alert-soft">
			<i class="fa-duotone fa-scale-balanced text-xl"></i>
			<p>{m.assignmentWeightingHint()}</p>
		</div>
		<Form {form}>
			<FormFieldset title={m.assignmentWeightsRating()}>
				<FormTextInput
					{form}
					name="nullRating"
					type="number"
					label={m.assignmentNullRating()}
					description={m.assignmentNullRatingDescription()}
				/>
				<FormTextInput
					{form}
					name="ratingFactor"
					type="number"
					label={m.assignmentRatingFactor()}
					description={m.assignmentRatingFactorDescription()}
				/>
			</FormFieldset>
			<FormFieldset title={m.assignmentWeightsWishes()}>
				<FormTextInput
					{form}
					name="markBonus"
					type="number"
					label={m.assignmentMarkBonus()}
					description={m.assignmentMarkBonusDescription()}
				/>
				<FormTextInput
					{form}
					name="nonWishMalus"
					type="number"
					label={m.assignmentNonWishMalus()}
					description={m.assignmentNonWishMalusDescription()}
				/>
			</FormFieldset>
		</Form>
	</div>
	<aside class="shrink-0 lg:w-96">
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
	</aside>
</div>
