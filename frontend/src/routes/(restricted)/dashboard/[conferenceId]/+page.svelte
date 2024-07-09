<script lang="ts">
	import type { PageData } from './$types';
	import Header from '$lib/components/Header.svelte';
	import UndrawCard from '$lib/components/UndrawCard.svelte';

	let { data }: { data: PageData } = $props();

	const getData = () => {
		return data.testData.find((x) => x.conferenceId == data.conferenceId);
	};
</script>

<Header titel={getData()?.conferenceName ?? 'Unknown'} />
<div class="flex flex-col py-10 gap-10">
	{#if getData()?.accepted && getData()?.active}
		<section class="flex flex-col gap-2">
			<h2 class="text-2xl font-bold">Delegationsmitglieder</h2>
			<div class="card bg-base-100 shadow-md">
				<div class="card-body">
					<table class="table">
						<thead>
							<tr>
								<th></th>
								<th>Name</th>
								<th>Gremium</th>
								<th></th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>1</td>
								<td>Max Mustermann</td>
								<td>GV</td>
								<td><i class="fa-duotone fa-medal"></i></td>
								<td
									><button class="btn btn-sm btn-ghost btn-circle"
										><i class="fa-duotone fa-ellipsis"></i></button
									></td
								>
							</tr>
							<tr>
								<td>2</td>
								<td>Frauke Musterfrau</td>
								<td>WiSo</td>
								<td></td>
								<td
									><button class="btn btn-sm btn-ghost btn-circle"
										><i class="fa-duotone fa-ellipsis"></i></button
									></td
								>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</section>
	{:else if getData()?.active}
		<section role="alert" class="alert alert-warning w-full">
			<i class="fas fa-exclamation-triangle text-3xl"></i>
			<div class="flex flex-col">
				<p class="font-bold">Wichtig: Online-Anmeldung abschließen</p>
				<p class="mt-2">
					Du hast zwar bereits eine Delegation erstellt bzw. bist einer Delegation beigetreten, aber
					die Anmeldung ist noch nicht abgeschlossen. Bitte schließe die Anmeldung rechtzeitig vor
					Anmeldeschluss ab, sodass wir die Anmeldung deiner Delegation berücksichtigen können.
				</p>
			</div>
		</section>
		<section class="flex flex-col gap-2">
			<h2 class="text-2xl font-bold">Delegationsstatus</h2>
			<div class="stats stats-vertical sm:stats-horizontal shadow">
				<div class="stat">
					<div class="stat-figure text-secondary">
						<i class="text-3xl fa-duotone fa-users"></i>
					</div>
					<div class="stat-title">Mitglieder</div>
					<div class="stat-value">3</div>
					<div class="stat-desc">in der Delegation</div>
				</div>

				<div class="stat">
					<div class="stat-figure text-secondary">
						<i class="text-3xl fa-duotone fa-flag"></i>
					</div>
					<div class="stat-title">Zahl</div>
					<div class="stat-value">7</div>
					<div class="stat-desc">ohne Bedeutung</div>
				</div>

				<div class="stat">
					<div class="stat-figure text-secondary">
						<i class="text-3xl fa-duotone fa-chart-pie"> </i>
					</div>
					<div class="stat-title">Statistik</div>
					<div class="stat-value">1,200</div>
					<div class="stat-desc">ohne Aussagekraft</div>
				</div>
			</div>
		</section>

		<section class="flex flex-col gap-2">
			<h2 class="text-2xl font-bold">Delegationsmitglieder</h2>
			<div class="card bg-base-100 shadow-md">
				<div class="card-body">
					<table class="table">
						<thead>
							<tr>
								<th></th>
								<th>Name</th>
								<th></th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>1</td>
								<td>Max Mustermann</td>
								<td><i class="fa-duotone fa-medal"></i></td>
								<td
									><button class="btn btn-sm btn-ghost btn-circle"
										><i class="fa-duotone fa-ellipsis"></i></button
									></td
								>
							</tr>
							<tr>
								<td>2</td>
								<td>Frauke Musterfrau</td>
								<td></td>
								<td
									><button class="btn btn-sm btn-ghost btn-circle"
										><i class="fa-duotone fa-ellipsis"></i></button
									></td
								>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</section>
	{:else}
		<p class="font-bold text-xl">
			Diese Konferenz hat bereits stattgefunden. Schön, dass du dabei warst!
		</p>
		<div class="flex gap-4 flex-col md:flex-row flex-wrap">
			<UndrawCard
				titel="Feedback"
				img="/undraw/feedback.svg"
				btnText="Feedback geben"
				btnLink="/feedback"
			>
				<p>Wir freuen uns über dein Feedback zur Konferenz</p>
			</UndrawCard>
			<UndrawCard
				titel="Teilnahmebestätigung"
				img="/undraw/certificate.svg"
				btnText="Bestätigung herunterladen"
				btnLink="/feedback"
			>
				<p>Hier kannst du deine Teilnahmebestätigung herunterladen</p>
			</UndrawCard>
		</div>
	{/if}
</div>
