<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { type PageData } from './$houdini';

	let { data }: { data: PageData } = $props();

	const conferenceData = $derived(data.conferenceQueryData);
	const conference = $derived(conferenceData?.findUniqueConference);
</script>

<div class="flex flex-col gap-2">
	<h1 class="text-2xl font-bold">{m.postalRegistration()}</h1>
	<!-- {#if conference.} -->
	<div class="alert alert-error mt-4">
		<i class="fas fa-traffic-cone text-3xl"></i>
		{m.postalRegistrationNotYetImplemented()}
	</div>
	<!-- TODO i18n this once the thing is fully implemented -->
	<div class="prose mt-4">
		<p>
			Um an der Konferenz teilnehmen zu können, benötigen wir von dir postalisch – als per Brief
			verschickt – ein paar unterschriebene Dokumente. Diese Dokumente sind
		</p>
		<ul class="list-disc pl-8">
			<li>
				die <strong>Einverständniserklärung unserer Allgemeinen Geschäftsbedingungen</strong>, die
				du selbst unterschreiben musst
			</li>
			<li>
				die <strong>Einverständniserklärung deiner Eltern oder Erziehungsberechtigten</strong>, die
				im Normalfall deine Eltern unterschreiben müssens, wenn du zu Konferenzbeginn ({conference?.startConference
					? new Date(conference.startConference!).toLocaleDateString()
					: 'Datum unbekannt'}) noch nicht volljährig bist
			</li>
			<li>
				die <strong>Einverständniserklärung zur Veröffentlichung von Bild- und Tonaufnahmen</strong
				>, die du und – wenn du zu Konferenz nicht volljährig bist – deine Eltern unterschreiben
				müssen
			</li>
		</ul>
		<p>
			Diese drei Dokumente werden dir als Formulare von der Teilnehmendenbetreuung zur Verfügung
			gestellt. Du musst sie ausdrucken, alle notwendigen Felder ausfüllen und dann wie oben
			beschrieben unterschreiben bzw. deine Eltern unterschreiben lassen.
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
