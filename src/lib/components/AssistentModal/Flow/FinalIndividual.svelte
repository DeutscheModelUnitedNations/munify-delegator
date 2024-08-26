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
	<p>
		Als Journalist*in oder für andere spezielle Rollen können Sie sich nur als Einzelperson
		bewerben. Sie finden die Auswahlmöglichkeit für Ihre gewünschte Rolle in der Kategorie <em
			>Einzelbewerbung</em
		>.
	</p>
</ChatBot>
<ChatBot delay={1400}>
	<p>Wir können Ihnen natürlich nicht garantieren, dass Sie ihre gewünschte Rolle tatsächlich bekommen.</p>
	<p>
		Sollten wir Ihren Wunsch bei der Zuteilung nicht berücksichtigen können, wird die
		Teilnehmendenbetreuung Kontakt aufnehmen und mit Ihnen Alternativen besprechen.
	</p>
</ChatBot>
<ChatBot delay={2400}>
	<p>
		Bei Fragen oder Problemen wenden Sie sich bitte an die Teilnehmendenbetreuung der Konferenz. Sie
		finden die Kontaktdaten auf der Website.
	</p>
</ChatBot>

<Choice {choices} delay={3400}></Choice>

<EndOfChat delay={4000}></EndOfChat>
