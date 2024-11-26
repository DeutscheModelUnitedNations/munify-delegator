<script lang="ts">
	import TextPreview from '$lib/components/TextPreview.svelte';
	import { getDelegationApplications } from './appData.svelte';
	import DelegationCard from './DelegationCard.svelte';

	const getRejections = () =>
		getDelegationApplications().filter(
			(x) => (x.disqualified || (!x.assignedNation && !x.assignedNSA)) && !x.splittedInto
		);

	const getSplittings = () => getDelegationApplications().filter((x) => x.splittedInto);
</script>

<TextPreview>
	<h2>Zusammenfassung</h2>
	<p>
		Überprüfe alle Zuteilungen und stelle sicher, dass alle Rollen und Delegationen korrekt
		zugeordnet sind. Du kannst die Zuteilungen jederzeit anpassen.
	</p>
	<p>
		Achte besonders auf die Teilnehmenden, die nicht zugeordnet bzw. ausgeschlossen wurden. Diesen
		sollte außerdem eine persönliche Absage erteilt werden.
	</p>
	<p>
		Außerdem solltest du auch allen Teilnehmenden, die fusioniert oder aufgeteilt wurden, eine
		persönliche Nachricht zukommen lassen.
	</p>
	<p>
		Wenn du mit den Zuteilungen zufrieden bist, kannst du die Zuteilungen abschließen, indem du die
		Datei ein letztes Mal exportierst und anschließend im Admin-Bereich wieder importierst.
	</p>
</TextPreview>

<div class="mt-10 flex flex-col gap-10">
	<div class="flex flex-col gap-4 rounded-lg bg-base-200 p-4 shadow-lg">
		<h2 class="text-xl font-bold"><i class="fas fa-user-slash mr-3"></i>Ausschlüsse</h2>
		<div class="flex flex-wrap gap-2">
			{#each getRejections() as application}
				<DelegationCard {application} />
			{/each}
		</div>
	</div>
	<div class="flex flex-col gap-4 rounded-lg bg-base-200 p-4 shadow-lg">
		<h2 class="text-xl font-bold"><i class="fas fa-split mr-3"></i>Zerteilungen</h2>
		<div class="flex flex-wrap gap-2">
			{#each getSplittings() as application}
				<DelegationCard {application} />
			{/each}
		</div>
	</div>
	<div class="flex flex-col gap-4 rounded-lg bg-base-200 p-4 shadow-lg">
		<h2 class="text-xl font-bold"><i class="fas fa-merge mr-3"></i>Zusammenführungen</h2>
		<div class="flex flex-wrap gap-2">
			<!-- {#each getDelegationApplications().filter((x) => (x.disqualified || (!x.assignedNation && !x.assignedNSA)) && !x.splittedInto) as application}
				<DelegationCard {application} />
			{/each} -->
		</div>
	</div>
</div>
