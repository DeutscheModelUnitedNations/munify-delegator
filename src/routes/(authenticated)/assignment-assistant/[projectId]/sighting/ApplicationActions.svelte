<script lang="ts">
	import StarRating from '$lib/components/StarRating.svelte';
	import {
		getApplications,
		evaluateApplication,
		toggleFlagApplication,
		toggleDisqualifyApplication,
		getMoreInfoLink,
		deleteEvaluation,
		addNote
	} from '../appData.svelte';

	/** The rating and the buttons in the header of an application in the sighting view. */
	interface Props {
		application: ReturnType<typeof getApplications>[number];
	}

	let { application }: Props = $props();
</script>

<div class="flex items-center gap-4">
	<StarRating
		rating={application.evaluation ?? 0}
		changeRating={(rating: number) => evaluateApplication(application.id, rating)}
		deleteRating={() => deleteEvaluation(application.id)}
	/>
	<div class="tooltip" data-tip="Mehr Infos">
		<a
			class="btn btn-square"
			aria-label="More Info"
			href={getMoreInfoLink(application.id)}
			target="_blank"
		>
			<i class="fas fa-info"></i>
		</a>
	</div>
	<div class="tooltip" data-tip="Note">
		<button
			class="btn btn-square"
			aria-label="Note"
			onclick={() => {
				const note = prompt('Notiz:');
				addNote(application.id, note ?? '');
			}}
		>
			<i class="fas fa-sticky-note"></i>
		</button>
	</div>
	<div class="tooltip" data-tip="Highlight">
		<button
			class="btn btn-square {application.flagged && 'btn-warning'}"
			onclick={() => {
				toggleFlagApplication(application.id);
			}}
			aria-label="Flag"
		>
			<i class="fas fa-flag"></i>
		</button>
	</div>
	<div class="tooltip" data-tip="Disqualify">
		<button
			class="btn btn-square {application.disqualified && 'btn-error'}"
			disabled={!!application.splittedInto}
			onclick={() => {
				toggleDisqualifyApplication(application.id);
			}}
			aria-label="Disqualify"
		>
			<i class="fas fa-user-slash"></i>
		</button>
	</div>
</div>
