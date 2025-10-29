<script lang="ts">
	import TextPreview from '$lib/components/TextPreview.svelte';
	import codenamize from '$lib/services/codenamize';
	import formatNames from '$lib/services/formatNames';
	import { onMount } from 'svelte';
	import {
		getApplications,
		getConference,
		getDelegationApplications,
		getNations,
		getNSAs,
		getProject,
		loadProjects,
		type Delegation,
		type Nation,
		type NonStateActor
	} from '../appData.svelte';
	import DelegationCard from '../DelegationCard.svelte';
	import NationCard from '../NationCard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	onMount(() => {
		loadProjects(data.projectId);
	});
	const project = $derived(getProject());

	const getRejections = $derived(() =>
		getDelegationApplications().filter(
			(x) => (x.disqualified || (!x.assignedNation && !x.assignedNSA)) && !x.splittedInto
		)
	);

	const getSplittings = $derived(() => {
		const applications = getApplications();
		return (applications.filter((x) => !!x.splittedInto) as Delegation[]).map((x) => {
			const parent = x;
			const children = x.splittedInto!.map((id) => applications.find((y) => y.id === id));
			return { parent, children: children as Delegation[] };
		});
	});

	const getMerges = $derived(() => {
		const applications = getDelegationApplications();
		const nations = getNations();
		const NSAs = getNSAs();
		const res: ({ applications: Delegation[] } & (
			| { nation: Nation; nsa: never }
			| { nation: never; nsa: NonStateActor }
		))[] = [];
		nations.forEach((x) => {
			const assignments = applications.filter(
				(y) => x.nation.alpha2Code === y.assignedNation?.alpha2Code
			);
			console.log(assignments);
			if (assignments.length > 1)
				res.push({ nation: x.nation, nsa: undefined as never, applications: assignments });
		});
		NSAs.forEach((x) => {
			const assignments = applications.filter((y) => x.id === y.assignedNSA?.id);
			if (assignments.length > 1)
				res.push({ nation: undefined as never, nsa: x, applications: assignments });
		});
		return res;
	});

	const copySplitExplanationText = (parent: Delegation, children: Delegation[]) => {
		const text = `Ehrenwerte Teilnehmende,\n\nLeider mussten wir im Zuge der Verteilung für ${getConference()?.title} ihre Delegation mit der ID ${parent.id} aufteilen.\n\nDabei haben wir die folgende Aufteilung vorgenommen:\n${children
			.map((x, i) => {
				return `Delegation ${i + 1}: ${x.members
					.map((y) => formatNames(y.user.given_name, y.user.family_name))
					.join(', ')}`;
			})
			.join(
				'\n'
			)}\n\nIhre Rollen entnehmen Sie bitte dem Dashboard auf der Website, sobald diese für alle verfügbar sind.\n\nGgf. kann es auch sein, dass eine oder mehrere diese neuen Delegationen mit anderen Delegationen fusioniert wurden.\nBei Fragen oder Unklarheiten können Sie sich gerne an uns wenden.`;
		navigator.clipboard.writeText(text);
		alert('Text kopiert! Sie können ihn nun in eine E-Mail einfügen.');
	};

	const copyMergeExplanationText = (delegations: Delegation[]) => {
		const text = `Ehrenwerte Teilnehmende,\n\nLeider mussten wir im Zuge der Verteilung für ${getConference()?.title} ihre Delegation mit einer oder mehreren anderen Delegationen fusionieren.\n\nSie sind nun Teil einer größeren Delegation. Die Mitglieder ihrer neuen Delegation sind:\n${delegations
			.map((x) =>
				x.members.map((y) => formatNames(y.user.given_name, y.user.family_name)).join(', ')
			)
			.join(
				', '
			)}\n\nIhre Rollen entnehmen Sie bitte dem Dashboard auf der Website, sobald diese für alle verfügbar sind.\n`;
		navigator.clipboard.writeText(text);
		alert('Text kopiert! Sie können ihn nun in eine E-Mail einfügen.');
	};
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
		Datei ein letztes Mal über den Button oben rechts exportierst und anschließend im Admin-Bereich
		wieder importierst.
	</p>
</TextPreview>

<div class="mt-10 flex flex-col gap-10">
	<div class="bg-base-200 flex flex-col gap-4 rounded-lg p-4 shadow-lg">
		<h2 class="text-xl font-bold"><i class="fas fa-user-slash mr-3"></i>Ausschlüsse</h2>
		<div class="flex flex-wrap gap-2">
			{#each getRejections() as application}
				<DelegationCard {application} />
			{/each}
		</div>
	</div>
	<div class="bg-base-200 flex flex-col gap-4 rounded-lg p-4 shadow-lg">
		<h2 class="text-xl font-bold"><i class="fas fa-split mr-3"></i>Zerteilungen</h2>
		<div class="flex flex-col gap-6">
			{#each getSplittings() as { parent, children }}
				<div class="flex grow-0 items-center justify-start gap-2">
					<div class="bg-base-300 flex items-center rounded-md p-2 shadow">
						<div class="flex flex-col">
							<h3 class="text-base font-bold">{codenamize(parent.id)}</h3>
							<p class="text-sm">{parent.id}</p>
						</div>
						<button
							aria-label="Copy"
							class="btn btn-ghost btn-sm"
							onclick={() => copySplitExplanationText(parent, children)}
						>
							<i class="fas fa-copy"></i>
						</button>
						<a
							aria-label="Details"
							class="btn btn-ghost btn-sm"
							href={`/management/${getConference()?.id}/delegations?selected=${parent.id}`}
							target="_blank"
						>
							<i class="fas fa-up-right-from-square"></i>
						</a>
					</div>
					<i class="fas fa-split text-xl"></i>
					<div class="flex grow-0 flex-col items-start justify-center gap-2">
						{#each children as child}
							<div class="bg-base-300 flex flex-col rounded-md p-2 shadow">
								<h3 class="text-base font-bold">{codenamize(child.id)}</h3>
								<p class="text-sm">
									{child.members
										.map((x) => formatNames(x.user.given_name, x.user.family_name))
										.join(', ')}
								</p>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>
	<div class="bg-base-200 flex flex-col gap-4 rounded-lg p-4 shadow-lg">
		<h2 class="text-xl font-bold"><i class="fas fa-merge mr-3"></i>Zusammenführungen</h2>
		<div class="flex flex-wrap gap-2">
			{#each getMerges() as { applications, nation, nsa }}
				{#if nation}
					<NationCard {nation}>
						{#each applications as application}
							<DelegationCard {application} />
						{/each}
					</NationCard>
				{:else if nsa}
					<NationCard {nsa}>
						{#each applications as application}
							<DelegationCard {application} />
						{/each}
					</NationCard>
				{/if}
			{/each}
		</div>
	</div>

	{#if project}
		<a class="btn btn-primary" href={'/management/' + project.data.conference.id + '/assignment'}
			>Zurück zur Admin Oberfläche</a
		>
	{/if}
</div>
