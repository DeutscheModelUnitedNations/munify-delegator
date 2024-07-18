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
			href: `${conferenceId}/supervisor`
		}
	];
  
</script>

<ChatBot delay={400}>
	<p>
		Dann müssen Sie jetzt Ihre Delegationsleiter*innen (also die jeweiligen Ersteller*innen der
		Delegation) bitten, Ihnen den Beitrittscode zu geben.
	</p>
	<p>Anschließend können Sie sich als Betreuer*in anmelden.</p>
</ChatBot>
<ChatBot delay={1400}>
	<p>
		Sie können mehrere Delegationscodes auf einmal angeben und es ist auch auf dem gleichen Weg
		möglich, weiteren Delegationen nachträglich beizutreten.
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
