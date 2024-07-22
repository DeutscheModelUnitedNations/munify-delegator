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
			title: 'Zur Anmeldung',
			class: 'btn-primary',
			href: `${conferenceId}/create`
		}
	];
  
</script>

<ChatBot delay={400}>
	<p>
		Dann müssen Sie jetzt zunächst eine Delegation erstellen.
	</p>
	<p>
		Anschließend können Sie Ihre Mitdelegierten über einen Beitrittscode oder einen magischen Link zur Anmeldung einladen.
	</p>
</ChatBot>
<ChatBot delay={1400}>
	<p>
		Der/die Ersteller*in wird automatisch zur Delegationsleiter*in.
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
