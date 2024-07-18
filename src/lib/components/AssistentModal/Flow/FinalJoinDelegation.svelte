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
			title: 'Zum Delegationsbeitritt',
			class: 'btn-primary',
			href: `${conferenceId}/join`
		}
	];
</script>

<ChatBot delay={400}>
	<p>
		Super! Dann müssen Sie jetzt Ihre Delegationsleiter*innen bitten, Ihnen den Beitrittscode zu geben.
	</p>
	<p>Mit dem Beitrittscode können Sie dann der Delegation beitreten.</p>
</ChatBot>
<ChatBot delay={1400}>
	<p>
		Alternativ kann Ihnen auch der Delegationsleiter*in einen magischen Link zur Anmeldung schicken.
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
