<script lang="ts">
	import CardInfoSectionWithIcons from '$lib/components/CardInfoSectionWithIcons.svelte';
	import UndrawCard from '$lib/components/UndrawCard.svelte';
	import AssistentModal from '$lib/components/AssistentModal/Modal.svelte';

	import UndrawNew from '$assets/undraw/new.svg';
	import UndrawTeam from '$assets/undraw/team.svg';
	import UndrawLetter from '$assets/undraw/letter.svg';
	import UndrawEducator from '$assets/undraw/educator.svg';

	import type { PageData } from './$types';
	import MermaidWrapper from '$lib/components/MermaidWrapper.svelte';

	let { data }: { data: PageData } = $props();

	let showAssistent = $state(false);
</script>

<div class="w-full min-h-screen bg-light-blue-500 flex flex-col items-center p-4">
	<hero class="my-20 text-center">
		<h1 class="text-3xl tracking-wider uppercase mb-3">Anmeldung</h1>
		<p class="max-ch-md">
			Sie haben verschiedene Möglichkeiten, sich anzumelden. Auf einen Staat oder eine*n
			nichtstaatliche*n Akteur*in bewerben Sie sich als Team von mindestens 2 Personen. Auf
			Spezielle Rollen wie als Mitglied der Konferenzpresse bewerben Sie sich alleine.
		</p>
		<a class="btn btn-warning mt-6" href=".">Zurück</a>
		<div role="alert" class="alert mt-10">
			<i class="fa-solid fa-message-question text-xl mx-1"></i>
			<div class="flex flex-col">
				<div class="font-bold tracking-wider">Anmeldeassistent</div>
				<div class="max-ch-sm">
					Der Anmeldeprozess kann auf den ersten Blick kompliziert wirken. Nutzen Sie den
					Anmeldeassistenten, um einen Überblick zu erhalten.
				</div>
			</div>
			<div>
				<button class="btn btn-sm btn-primary" onclick={() => (showAssistent = true)}
					>Assistent öffnen</button
				>
			</div>
		</div>
	</hero>

	<main>
		<section
			class="w-full flex flex-col md:flex-row justify-center items-center md:items-stretch gap-8 flex-wrap"
		>
			<UndrawCard
				titel="Delegation anlegen"
				img={UndrawNew}
				btnText="Neue Delegation anlegen"
				btnLink={`${data.conferenceId}/create`}
			>
				<CardInfoSectionWithIcons
					items={[
						{
							icon: 'fa-arrow-right',
							text: 'Hier kannst du als Delegationsleiter*in eine neue Delegation anlegen und Menschen zu der Delegation einladen'
						},
						{
							icon: 'fa-podium',
							text: 'Rollen: Delegierte*r eines Staates oder Vertreter*in eines Nichtstaatlichen Akteurs'
						}
					]}
				/>
			</UndrawCard>

			<UndrawCard
				titel="Delegation beitreten"
				img={UndrawTeam}
				btnText="Code Eingeben"
				btnLink={`${data.conferenceId}/join`}
			>
				<CardInfoSectionWithIcons
					items={[
						{
							icon: 'fa-arrow-right',
							text: 'Hier kannst du einer Delegation mit einem Code beitreten, den dir der/die Delegationsleiter*in ausgestellt hat.'
						},
						{
							icon: 'fa-podium',
							text: 'Rollen: Delegierte*r eines Staates oder Vertreter*in eines Nichtstaatlichen Akteurs'
						}
					]}
				/>
			</UndrawCard>

			<UndrawCard
				titel="Einzelbewerbung"
				img={UndrawLetter}
				btnText="Zur Einzelbewerbung"
				btnLink={`${data.conferenceId}/individual`}
			>
				<CardInfoSectionWithIcons
					items={[
						{
							icon: 'fa-arrow-right',
							text: 'Hier kannst du dich alleine auf einen Platz ein einer der Speziellen Delegationen wie der Konferenzpresse bewerben.'
						},
						{
							icon: 'fa-podium',
							text: 'Rollen: Mitglied der Konferenzpresse, Richter*in des IGH oder Prozessbevollmächtigte*r'
						}
					]}
				/>
			</UndrawCard>

			<UndrawCard
				titel="Betreuer*in"
				img={UndrawEducator}
				btnText="Anmeldung als Betreuer*in"
				btnLink={`${data.conferenceId}/supervisor`}
			>
				<CardInfoSectionWithIcons
					items={[
						{
							icon: 'fa-arrow-right',
							text: 'Hier kannst du dich als Betreuer*in für eine Delegation anmelden. Als Betreuer*in hast du Einsicht in alle deine Delegationen und kannst sie organisatorisch unterstützen.'
						}
					]}
				/>
			</UndrawCard>
		</section>
		<section class="mt-20 text-center">
			<h2 class="text-2xl font-bold mb-2">Wie bewerbe ich mich?</h2>
			<p class="mb-4">Das folgende Diagramm stellt dar, wie Sie sich auf welche Rolle bewerben.</p>
			<div
				class="mx-auto card bg-[#f6f7fb] shadow-lg p-4 w-full max-w-[1000px] flex justify-center items-center"
			>
				<MermaidWrapper
					diagram={`\
						%%{
							init: {
								'themeVariables': {
									'edgeLabelBackground':'#f6f7fb'
								}
							}
						}%%
					flowchart TD
						A(Welche Rolle möchte ich auf der Konferenz einnehmen?):::question
						
						A --> Delegate(fa:fa-flag\nDelegierter\neines Landes):::role
						A --> NSA(fa:fa-megaphone\nNichtstaatliche*r\nAkteur*in):::role
						NSA --> B(Habe ich Personen, mit denen\nich mich als Gruppe bewerben kann?):::question
						Delegate --> B

						B -->|Ja| C(Hat eine der Personen schon\neine Delegation angelegt?):::question
						B --->|Nein| Individual{fa:fa-envelope\nEinzel-\nbewerbung}:::outcome

						C --> |Nein| E{fa:fa-plus\nDelegation\nanlegen}:::outcome
						C --> |Ja| D{fa:fa-right-to-bracket\nDelegation\nbeitreten}:::outcome

						A --> Journalist(fa:fa-newspaper\nJournalist*in):::role ----> Individual
						A --> Special(fa:fa-gavel\nSpezielle Rolle):::role ----> Individual

						A --> Supervisor(fa:fa-chalkboard-user\nBetreuer*in):::role
						Supervisor --> F(Haben meine Schüler*innen\nschon eine oder mehrere\nDelegationen erstellt?):::question
						F -.-> |Nein| Wait(fa:fa-hourglass-clock\nAuf Anmeldung\nIhrer Schüler*innen\nwarten):::wait
						F ---> |Ja| G{fa:fa-right-to-bracket\nAnmeldung als\nBetreuer*in}:::outcome
						
						classDef question fill:#3d7dd2,stroke-width:3px,stroke:#3d7dd2,color:white,font-family:Outfit;
						classDef role fill:#f9f9f9,stroke:#333,stroke-width:1px,font-family:Outfit;
						classDef outcome fill:#cfc,stroke-width:3px,font-family:Outfit;
						classDef wait fill:#fbb,stroke:#000,stroke-width:1px,font-family:Outfit;

						linkStyle default stroke-width:3px;

						click E "/registration/${data.conferenceId}/create"
						click D "/registration/${data.conferenceId}/join"
						click Individual "/registration/${data.conferenceId}/individual"
						click G "/registration/${data.conferenceId}/supervisor"
				`}
				></MermaidWrapper>
			</div>
		</section>
	</main>
</div>

{#if showAssistent}
	<AssistentModal onClose={() => (showAssistent = false)} conferenceId={data.conferenceId} />
{/if}
