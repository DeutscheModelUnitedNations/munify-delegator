<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { type PageData } from './$houdini';

	let { data }: { data: PageData } = $props();

	let conferenceData = $derived(data.conferenceQueryData?.findUniqueConference);
</script>

<div class="flex flex-col gap-2">
	<h1 class="text-2xl font-bold">{m.postalRegistration()}</h1>
	<!-- TODO i18n this once the thing is fully implemented -->
	<div class="prose">
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
				im Normalfall deine Eltern unterschreiben müssens, wenn du zu Konferenzbeginn ({conferenceData
					? new Date(conferenceData.startConference).toLocaleDateString()
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
	</div>
	<div class="alert alert-error mt-4">
		<i class="fas fa-traffic-cone text-3xl"></i>
		{m.postalRegistrationNotYetImplemented()}
	</div>
</div>
