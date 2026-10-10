<script lang="ts">
	import type { ConferencestateEnum } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		title: string;
		longTitle?: string | null;
		state: ConferencestateEnum;
		startDate?: Date | null;
		endDate?: Date | null;
		emblemUrl?: string | null;
		logoUrl?: string | null;
	}

	let { title, longTitle, state, startDate, endDate, emblemUrl, logoUrl }: Props = $props();

	const formatDate = (date: Date | null | undefined) => {
		if (!date) return '';
		return new Date(date).toLocaleDateString(undefined, {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	};

	const formatDateRange = (start: Date | null | undefined, end: Date | null | undefined) => {
		if (!start || !end) return '';
		const startD = new Date(start);
		const endD = new Date(end);

		// Same month and year
		if (startD.getMonth() === endD.getMonth() && startD.getFullYear() === endD.getFullYear()) {
			return `${startD.getDate()}. – ${endD.toLocaleDateString(undefined, {
				day: 'numeric',
				month: 'long',
				year: 'numeric'
			})}`;
		}

		// Different months
		return `${formatDate(start)} – ${formatDate(end)}`;
	};

	const translateState = (s: ConferencestateEnum) => {
		switch (s) {
			case 'PRE':
				return m.conferenceStatusPre();
			case 'PARTICIPANT_REGISTRATION':
				return m.conferenceStatusParticipantRegistration();
			case 'PREPARATION':
				return m.conferenceStatusPreparation();
			case 'ACTIVE':
				return m.conferenceStatusActive();
			case 'POST':
				return m.conferenceStatusPost();
			default:
				return s;
		}
	};

	const getStateColor = (s: ConferencestateEnum) => {
		switch (s) {
			case 'PRE':
				return 'badge-neutral';
			case 'PARTICIPANT_REGISTRATION':
				return 'badge-info';
			case 'PREPARATION':
				return 'badge-warning';
			case 'ACTIVE':
				return 'badge-success';
			case 'POST':
				return 'badge-neutral';
			default:
				return 'badge-ghost';
		}
	};
</script>

<header class="card bg-base-100 border-base-200 border shadow-sm">
	<div class="card-body">
		<div class="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
			{#if logoUrl}
				<div class="shrink-0">
					<img
						src={logoUrl}
						alt={title}
						class="h-20 w-20 rounded-box object-contain md:h-24 md:w-24"
					/>
				</div>
			{:else if emblemUrl}
				<div class="shrink-0">
					<img
						src={emblemUrl}
						alt={title}
						class="h-20 w-20 rounded-box object-contain md:h-24 md:w-24"
					/>
				</div>
			{:else}
				<div
					class="bg-primary/10 text-primary flex h-20 w-20 shrink-0 items-center justify-center rounded-box md:h-24 md:w-24"
				>
					<i class="fa-sharp-duotone fa-solid fa-landmark-flag text-4xl"></i>
				</div>
			{/if}

			<div class="flex flex-1 flex-col gap-2">
				<div class="flex flex-wrap items-center gap-3">
					<h1 class="text-2xl font-bold md:text-3xl">{title}</h1>
					<span class="badge {getStateColor(state)}">{translateState(state)}</span>
				</div>

				{#if longTitle}
					<p class="text-base-content/70 text-sm">{longTitle}</p>
				{/if}

				{#if startDate && endDate}
					<div class="text-base-content/60 flex items-center gap-2 text-sm">
						<i class="fa-sharp-duotone fa-solid fa-calendar-days"></i>
						<span>{formatDateRange(startDate, endDate)}</span>
					</div>
				{/if}
			</div>
		</div>
	</div>
</header>
