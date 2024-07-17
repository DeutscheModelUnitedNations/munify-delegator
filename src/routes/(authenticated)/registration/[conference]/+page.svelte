<script lang="ts">
	import CardInfoSectionWithIcons from '$lib/components/CardInfoSectionWithIcons.svelte';
	import UndrawCard from '$lib/components/UndrawCard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
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
	</hero>

	<main>
		<section
			class="w-full flex flex-col md:flex-row justify-center items-center md:items-stretch gap-8 flex-wrap"
		>
			<UndrawCard
				titel="Delegation anlegen"
				img="/undraw/new.svg"
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
				img="/undraw/team.svg"
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
				img="/undraw/letter.svg"
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
				img="/undraw/educator.svg"
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
	</main>
</div>
