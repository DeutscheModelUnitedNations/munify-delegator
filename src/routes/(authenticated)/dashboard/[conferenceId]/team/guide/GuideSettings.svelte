<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { genericPromiseToastMessages } from '#lib/utils/toast';

	/**
	 * The conference's guide switches: which series it belongs to (project management; shared
	 * pages reach it only with one) and whether participants read the guide.
	 */
	interface Props {
		conferenceId: string;
		canChangeSeries: boolean;
	}

	let { conferenceId, canChangeSeries }: Props = $props();

	const [conference, seriesList] = $derived(
		await Promise.all([
			client.liveQuery.conference({
				__args: { id: conferenceId },
				seriesId: true,
				guidePublished: true,
				assignmentReleased: true,
				linkToPreparationGuide: true
			}),
			client.liveQuery.conferenceSeriesList({ name: true, abbreviation: true })
		])
	);

	function save(change: { seriesId?: string | null; guidePublished?: boolean }) {
		const promise = client.mutate.updateConference({
			__args: { id: conferenceId, ...change },
			guidePublished: true,
			seriesId: true
		});
		toast.promise(promise, genericPromiseToastMessages);
	}
</script>

<section
	class="rounded-box border-base-300 bg-base-200 grid gap-4 border p-4 md:grid-cols-2"
	data-tour="team.guide.settings"
	aria-label={m.guideSettings()}
>
	<label class="fieldset">
		<span class="fieldset-legend">{m.conferenceSeries()}</span>
		<select
			class="select w-full"
			value={conference.seriesId ?? ''}
			disabled={!canChangeSeries}
			onchange={(event) => save({ seriesId: event.currentTarget.value || null })}
		>
			<option value="">{m.guideScopeNoSeries()}</option>
			{#each seriesList as series (series.id)}
				<option value={series.id}>{series.name}</option>
			{/each}
		</select>
		<span class="label text-wrap">{m.conferenceSeriesHint()}</span>
	</label>
	<div class="fieldset">
		<span class="fieldset-legend">{m.guidePublishedSwitch()}</span>
		<label class="label cursor-pointer justify-start gap-3">
			<input
				type="checkbox"
				class="toggle toggle-success"
				checked={conference.guidePublished}
				onchange={(event) => save({ guidePublished: event.currentTarget.checked })}
			/>
			<span class="text-wrap">{m.guidePublishedHint()}</span>
		</label>
		{#if conference.guidePublished && !conference.assignmentReleased}
			<span class="text-warning text-sm">{m.guideWaitsForRelease()}</span>
		{:else if !conference.guidePublished && conference.linkToPreparationGuide}
			<span class="text-sm opacity-70">{m.guideFallbackLink()}</span>
		{/if}
	</div>
</section>
