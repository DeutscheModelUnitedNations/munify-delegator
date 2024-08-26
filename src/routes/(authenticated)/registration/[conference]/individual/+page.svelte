<script lang="ts">
	import CardInfoSectionWithIcons from '$lib/components/CardInfoSectionWithIcons.svelte';
	import PlainCard from '$lib/components/PlainCard.svelte';

	const testData = [
		{
			roleId: 1,
			role: 'Konferenzpresse',
			description: 'Du berichtest als Journalist*in über die Konferenz und die Debatten.',
			icon: 'fa-newspaper'
		},
		{
			roleId: 2,
			role: 'Richter*in am IGH',
			description:
				'Du besteigst die Richterbank und entscheidest über einen internationalen Rechtsfall.',
			icon: 'fa-gavel'
		},
		{
			roleId: 3,
			role: 'Prozessbevollmächtigte*r A',
			description: 'Du vertrittst die Interessen von A vor dem Internationalen Gerichtshof.',
			icon: 'fa-balance-scale'
		},
		{
			roleId: 4,
			role: 'Prozessbevollmächtigte*r B',
			description: 'Du vertrittst die Interessen von B vor dem Internationalen Gerichtshof.',
			icon: 'fa-balance-scale'
		}
	];
</script>

<div class="w-full min-h-screen bg-light-blue-500 flex flex-col items-center p-4">
	<hero class="my-20 text-center">
		<h1 class="text-3xl tracking-wider uppercase mb-3">Einzelbewerbung</h1>
		<p class="max-ch-md">
			Hier können Sie sich als Einzelperson für spezielle Rollen bewerben. Diese Rollen sind nicht
			an eine Delegation gebunden. Wenn Sie nicht für die Rolle genommen werden, werden wir mit
			Ihnen Kontakt aufnehmen und eine andere Rolle vorschlagen.
		</p>
		<a class="btn btn-warning mt-6" href=".">Zurück</a>
	</hero>

	<main>
		<section class="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
			<PlainCard
				title={'Einzelbewerbung als Delegierte*r'}
				description="Du möchtest ein Delegierte*r sein, hast aber keine Personen für eine Delegation gefunden."
				icon="fa-user-tie"
				link={`./individual/delegate`}
			/>
			{#each testData as { roleId, role, description, icon }}
				<PlainCard title={role} {description} {icon} link={`./individual/${roleId}`} />
			{/each}
		</section>
	</main>
</div>
