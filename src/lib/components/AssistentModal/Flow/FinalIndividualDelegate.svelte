<script lang="ts">
	import ChatBot from '../ChatBot.svelte';
	import Choice from '../Choice.svelte';
	import EndOfChat from '../EndOfChat.svelte';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	const choices = [
		{
			icon: 'arrow-right',
			title: 'Zur Einzelbewerbung',
			class: 'btn-primary',
			href: `${conferenceId}/individual`
		}
	];
</script>

<ChatBot delay={400}>
	<p>Kein Problem! Auch Einzelanmeldungen für Delegierte und NAs sind möglich.</p>
	<p>
		In der Auswahl unter <em>Einzelbewerbung</em> finden Sie u.a. auch den Punkt
		<em>Einzelanmeldung als Delegierte*r</em>. Hier können Sie sich anmelden.
	</p>
</ChatBot>
<ChatBot delay={1400}>
	<p>
		Die Bewerbung nimmt dann zur Ende der Anmeldephase an einem Matchmaking-Prozess teil, bei dem
		Ihnen ein freier Platz in einer Delegation oder als NA zugewiesen wird.
	</p>
	<p>
		Bitte beachten Sie, dass Ihre Wunschmöglichkeiten bei einer Einzelbewerbung sehr eingeschränkt
		sind. Wenn Sie sich alleine bewerben, dann bekommen sie eine freie Rolle zugeteilt.
	</p>
</ChatBot>
<ChatBot delay={2400}>
	<p>
		Bei Fragen oder Problemen wenden Sie sich bitte an die Teilnehmendenbetreuung des Projektes. Sie
		finden die Kontaktdaten auf der Website.
	</p>
</ChatBot>

<Choice {choices} delay={3400}></Choice>

<EndOfChat delay={4000}></EndOfChat>
