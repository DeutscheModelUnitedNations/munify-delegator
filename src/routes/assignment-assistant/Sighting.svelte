<script lang="ts">
	import TextPreview from '$lib/components/TextPreview.svelte';
	import { onMount } from 'svelte';
	import {
		addApplication,
		evaluateApplication,
		getApplications,
		toggleDisqualifyApplication,
		toggleFlagApplication
	} from './applications.svelte';
	import StarRating from '$lib/components/StarRating.svelte';
	import { RoleCategory } from './roles.svelte';
</script>

<TextPreview>
	<h2>Sichtung der Bewerbungen</h2>
	<p>
		Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut
		labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco
		laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in
		voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat
		non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
	</p>
</TextPreview>

<div class="mt-6 flex flex-col gap-4">
	{#each getApplications() as application}
		<div class="card p-4 shadow-lg">
			<div class="flex items-center justify-between">
				<div class="flex flex-col">
					<h3 class="text-xl font-bold">{application.readableId}</h3>
					<h5 class="text-sm font-thin">{application.id}</h5>
				</div>
				<div class="flex items-center gap-4">
					<StarRating
						rating={application.evaluation}
						changeRating={(rating: number) => evaluateApplication(application.id, rating)}
					/>
					<div class="tooltip" data-tip="Note">
						<button class="btn btn-square">
							<i class="fas fa-memo-circle-info"></i>
						</button>
					</div>
					<div class="tooltip" data-tip="Highlight">
						<button
							class="btn btn-square {application.flagged && 'btn-warning'}"
							onclick={() => {
								toggleFlagApplication(application.id);
							}}
						>
							<i class="fas fa-flag"></i>
						</button>
					</div>
					<div class="tooltip" data-tip="Disqualify">
						<button
							class="btn btn-square {application.disqualified && 'btn-error'}"
							onclick={() => {
								toggleDisqualifyApplication(application.id);
							}}
						>
							<i class="fas fa-user-slash"></i>
						</button>
					</div>
				</div>
			</div>
		</div>
	{/each}
</div>
