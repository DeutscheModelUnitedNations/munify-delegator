<!--
	@component
	How many people the picked audience reaches right now, by kind. Fetched beside the rendering,
	not awaited in it: an awaited count would hold back every update its audiences take part in, so
	a picked block would only show once the server had counted. While a new count loads the old one
	stays, dimmed.
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import { logger } from '#lib/logger';
	import { audienceInput, type Audience } from '#lib/helpers/announcements';

	interface Props {
		conferenceId: string;
		audiences: Audience[];
	}

	let { conferenceId, audiences }: Props = $props();

	function fetchCounts() {
		return client.query.announcementAudiencePreview({
			__args: { conferenceId, audiences: audiences.map(audienceInput) },
			total: true,
			delegates: true,
			singleParticipants: true,
			supervisors: true,
			waitingList: true,
			team: true
		});
	}

	let counts = $state<Awaited<ReturnType<typeof fetchCounts>>>();
	let loading = $state(false);
	let failed = $state(false);
	/** Bumped by every request, so an answer overtaken by a newer one is dropped. */
	let latest = 0;
	let retries = $state(0);

	// the blocks are replaced as a whole on every change, so this asks again only then
	$effect(() => {
		void retries;
		const request = ++latest;
		loading = true;
		failed = false;
		fetchCounts()
			.then((result) => {
				if (request === latest) counts = result;
			})
			.catch((error: unknown) => {
				if (request !== latest) return;
				logger.warn('Counting the announcement audience failed', error);
				failed = true;
			})
			.finally(() => {
				if (request === latest) loading = false;
			});
	});

	const breakdownText = $derived(
		counts
			? [
					{ label: m.announcementAudienceDelegates(), count: counts.delegates },
					{ label: m.announcementAudienceSingleParticipants(), count: counts.singleParticipants },
					{ label: m.announcementAudienceSupervisors(), count: counts.supervisors },
					{ label: m.announcementAudienceWaitingList(), count: counts.waitingList },
					{ label: m.announcementAudienceTeam(), count: counts.team }
				]
					.filter((part) => part.count > 0)
					.map((part) => `${part.count} ${part.label}`)
					.join(', ')
			: ''
	);
</script>

{#if failed}
	<p class="text-error flex items-center gap-1.5 text-xs" role="alert">
		<i aria-hidden="true" class="ph-duotone ph-warning text-sm"></i>
		{m.httpGenericError()}
		<button type="button" class="btn btn-ghost btn-xs" onclick={() => retries++}>
			<i aria-hidden="true" class="ph-duotone ph-arrow-clockwise"></i>
			{m.retry()}
		</button>
	</p>
{:else if counts}
	<p
		class={[
			'text-base-content/60 flex items-center gap-1.5 text-xs transition-opacity',
			loading && 'opacity-50'
		]}
		data-testid="audience-count"
		aria-live="polite"
		aria-busy={loading}
	>
		<i aria-hidden="true" class="ph-duotone ph-users-three text-sm"></i>
		<span>
			<span class="text-base-content/80 font-medium"
				>{m.announcementAudienceReaches({ count: counts.total })}</span
			>{#if breakdownText}
				· {breakdownText}{/if}
		</span>
	</p>
{:else}
	<div class="flex items-center gap-1.5" role="status" aria-busy="true">
		<div class="skeleton size-3.5 shrink-0 rounded-full"></div>
		<div class="skeleton h-3 w-72 max-w-full"></div>
	</div>
{/if}
