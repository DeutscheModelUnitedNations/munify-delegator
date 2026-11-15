<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import {
		PAPER_REVIEW_ANONYMOUS_AS,
		translatePaperReviewAnonymousAs
	} from '#lib/utils/enumTranslations';
	import type { ReviewAnonymity } from './reviewAnonymity';

	/** Whether a review goes out under a team name instead of the reviewer's, and which one. */
	interface Props {
		choice: ReviewAnonymity;
	}

	let { choice = $bindable() }: Props = $props();

	function pick(value: string) {
		const as = PAPER_REVIEW_ANONYMOUS_AS.find((option) => option === value);
		if (as) choice = { ...choice, as };
	}
</script>

<div class="flex flex-col gap-1">
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
		{/if}
	</div>
	{#if choice.anonymous}
		<p class="text-xs text-base-content/70">{m.reviewAnonymousHint()}</p>
	{/if}
</div>
