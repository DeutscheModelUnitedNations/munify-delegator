<script lang="ts">
	import type { PageData } from './$types';
	import Header from '$lib/components/Header.svelte';
	import UndrawCard from '$lib/components/UndrawCard.svelte';
	import Flag from '$lib/components/Flag.svelte';
	import DelegationStatusTableWrapper from '$lib/components/DelegationStatusTable/Wrapper.svelte';
	import DelegationStatusTableEntry from '$lib/components/DelegationStatusTable/Entry.svelte';
	import RoleWidget from '$lib/components/DelegationStats/RoleWidget.svelte';
	import GenericWidget from '$lib/components/DelegationStats/GenericWidget.svelte';

	let { data }: { data: PageData } = $props();

	const getData = () => {
		return data.testData.find((x) => x.conferenceId == data.conferenceId);
	};
</script>

<Header title={getData()?.conferenceName ?? 'Unknown'} />
<div class="flex flex-col py-10 gap-10">
	{#if getData()?.accepted && getData()?.active}
		<section class="flex flex-col gap-2">
			<h2 class="text-2xl font-bold">Delegationsstatus</h2>
			<div class="stats shadow">
				<RoleWidget countryCode="gb" />
			</div>
			<GenericWidget
				content={[
					{
						icon: 'users',
						title: 'Mitglieder',
						value: '3',
						desc: 'in der Delegation'
					},
					{
						icon: 'flag',
						title: 'Zahl',
						value: '7',
						desc: 'ohne Bedeutung'
					},
					{
						icon: 'chart-pie',
						title: 'Statistik',
						value: '1,200',
						desc: 'ohne Aussagekraft'
					}
				]}
			/>
		</section>

		<section class="flex flex-col gap-2">
			<h2 class="text-2xl font-bold">Delegationsmitglieder</h2>
			<DelegationStatusTableWrapper withCommittee withMailStatus withPaymentStatus>
				<DelegationStatusTableEntry
					name="Max Mustermann"
					headDelegate
					committee="GV"
					mailStatus="completed"
					paymentStatus="completed"
				/>
				<DelegationStatusTableEntry
					name="Frauke Musterfrau"
					committee="WiSo"
					mailStatus="error"
					paymentStatus="incomplete"
				/>
				<DelegationStatusTableEntry
					name="Hans Dampf"
					committee=""
					mailStatus="incomplete"
					paymentStatus="error"
				/>
			</DelegationStatusTableWrapper>
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
			<DelegationStatusTableWrapper>
				<DelegationStatusTableEntry name="Max Mustermann" headDelegate />
				<DelegationStatusTableEntry name="Frauke Musterfrau" />
			</DelegationStatusTableWrapper>
		</section>
	{:else}
		<div role="alert" class="alert alert-info">
			<i class="fas fa-clock text-2xl"></i>
			<span>Diese Konferenz hat bereits stattgefunden. Schön, dass du dabei warst!</span>
		</div>
		<section>
			<RoleWidget countryCode="de" />
		</section>
		<section class="flex gap-4 flex-col md:flex-row flex-wrap">
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
		</section>
	{/if}
</div>
