<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { type PageData } from './$houdini';
	import { graphql } from '$houdini';

	let { data }: { data: PageData } = $props();

	const conferenceData = $derived(data.conferenceQueryData);
	const conference = $derived(conferenceData?.findUniqueConference);
	const userData = $derived(data.user);
	const userEmail = $derived(userData.email);

	const userQuery = graphql(`
		query GetUserDetails($email: String!) {
			findUniqueUser(where: { email: $email }) {
				id
				given_name
				family_name
				street
				apartment
				zip
				city
				country
				birthday
			}
		}
	`);

	// const userDetailsStore = userQuery.fetch({ email: userEmail });
</script>
<div class="flex flex-col gap-2">
	<!-- Add error handling and loading states -->
	<h1 class="text-2xl font-bold">{m.postalRegistration()}</h1>
	<!-- TODO i18n this once the thing is fully implemented -->
	<div class="prose mt-4">
		<p>
			Um an der Konferenz teilnehmen zu können, benötigen wir von dir postalisch – also die
			Originale per Brief verschickt (keine Kopien) – ein paar unterschriebene Dokumente. Wir
			stellen die Dokumente als Paket in einem PDF zum Download zur Verfügung. Enthalten sind die
			folgenden Dokumente:
		</p>
		<ul class="list-disc pl-8">
			<li>
				die <strong>verbindliche Anmeldung</strong>, der unsere Nutzungsbedingungen und
				Datenschutzerklärung zu Grunde legt und welche du selbst unterschreiben musst
			</li>
			<li>
				die <strong>Einverständniserklärung aller Eltern oder Erziehungsberechtigten</strong>, die
				im Normalfall <strong>beide</strong> (!) Eltern unterschreiben müssens, wenn du zu
				Konferenzbeginn ({conference?.startConference
					? new Date(conference.startConference!).toLocaleDateString()
					: 'Datum unbekannt'}) noch nicht volljährig bist
			</li>
			<li>
				die <strong>Einverständniserklärung zur Bildnutzung</strong>, die du und – wenn du zur
				Konferenz nicht volljährig bist – zusätzlich alle Eltern bzw. Erziehungsberechtigten
				unterschreiben müssen
			</li>
		</ul>
		<p>
			Du musst sie ausdrucken, alle notwendigen Felder ausfüllen und dann wie oben beschrieben
			unterschreiben bzw. auch deine Eltern unterschreiben lassen.
		</p>
		<p>
			Die Nutzungsbedingungen und die Datenschutzerklärung selbst sollte gelesen, muss aber nicht
			ausgedruckt und bitte auch nicht mitgeschickt werden.
		</p>
		<p>
			Leider reicht es nicht aus, die postalische Anmeldung einfach elektronisch zu unterzeichnen
			oder per Scan an uns zu senden. Uns wäre es auch viel lieber, wenn wir uns den Papierkram
			sparen könnten. Leider gibt das die rechtliche Rahmensituation in Deutschland nicht her. Daher
			führt an dem Versenden der Dokumente per Post kein Weg vorbei.
		</p>
		<h2>Wohin soll ich meine Dokumente versenden?</h2>
		<p>
			Bitte sende deine Dokumente gründlich ausgefüllt und unterschrieben (von dir und ggf. deinen
			Eltern) an folgende Adresse:
		</p>
		<div class="card bg-base-200 shadow-lg">
			<div class="card-body gap-10 sm:flex-row">
				<i class="fa-duotone fa-mailbox-flag-up text-5xl"></i>
				<address class="text-lg sm:text-xl">
					<strong>{conference?.postalName}</strong><br />
					<span>{conference?.postalStreet}</span><br />
					{#if conference?.postalApartment}
						<span>{conference?.postalApartment}</span><br />
					{/if}
					<br />
					<span>{conference?.postalZip} {conference?.postalCity}</span><br />
					<span>{conference?.postalCountry}</span>
				</address>
			</div>
		</div>
		<p>Bitte achte besonders bei Sendungen aus dem Ausland auf ausreichendes Porto.</p>
	</div>
</div>
