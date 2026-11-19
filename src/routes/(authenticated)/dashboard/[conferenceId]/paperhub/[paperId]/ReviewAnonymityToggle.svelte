<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import {
		PAPER_REVIEW_ANONYMOUS_AS,
		translatePaperReviewAnonymousAs
	} from '#lib/utils/enumTranslations';
	import { REVIEW_ANONYMOUS_NAME_MAX, type ReviewAnonymity } from './reviewAnonymity';

	/** Whether a review goes out under another name than the reviewer's, and which one. */
	interface Props {
		choice: ReviewAnonymity;
	}

	let { choice = $bindable() }: Props = $props();

	function pick(value: string) {
		const as = PAPER_REVIEW_ANONYMOUS_AS.find((option) => option === value);
		if (as) choice = { ...choice, as };
	}

	const nameMissing = $derived(choice.as === 'CUSTOM' && choice.name.trim().length === 0);
</script>

<div class="flex flex-col gap-1" data-tour="paperhub.review.anonymity">
	<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
		<label class="label cursor-pointer gap-2">
			<input
				type="checkbox"
				class="toggle toggle-sm"
				checked={choice.anonymous}
				onchange={(e) => (choice = { ...choice, anonymous: e.currentTarget.checked })}
			/>
			<span class="text-sm text-base-content">{m.reviewAnonymous()}</span>
		</label>
		{#if choice.anonymous}
			<select
				class="select select-sm w-auto"
				aria-label={m.reviewAnonymousAs()}
				value={choice.as}
				onchange={(e) => pick(e.currentTarget.value)}
			>
				{#each PAPER_REVIEW_ANONYMOUS_AS as option (option)}
					<option value={option}>{translatePaperReviewAnonymousAs(option)}</option>
				{/each}
			</select>
			{#if choice.as === 'CUSTOM'}
				<input
					type="text"
					class="input input-sm w-56"
					class:input-error={nameMissing}
					aria-label={m.reviewAnonymousName()}
					aria-invalid={nameMissing}
					placeholder={m.reviewAnonymousNamePlaceholder()}
					maxlength={REVIEW_ANONYMOUS_NAME_MAX}
					value={choice.name}
					oninput={(e) => (choice = { ...choice, name: e.currentTarget.value })}
				/>
			{/if}
		{/if}
	</div>
	{#if choice.anonymous}
		<p class="text-xs text-base-content/70">{m.reviewAnonymousHint()}</p>
	{/if}
</div>
