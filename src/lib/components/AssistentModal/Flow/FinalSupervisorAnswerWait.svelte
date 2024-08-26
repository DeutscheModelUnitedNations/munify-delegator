<script lang="ts">
	import ChatBot from '../ChatBot.svelte';
	import EndOfChat from '../EndOfChat.svelte';
</script>

<ChatBot delay={400}>
	<p>
		Dann bestimmen Sie bitte für jede Delegation eine*n Delegationsleiter*in und lassen sie Ihre
		Schüler*innen die Delegation anlegen.
	</p>
	<p>
		Anschließend erhalten die Delegationsmitglieder einen Beitrittscode, mit dem Sie sich der
		Delegation als Betreuer*in anschließen können.
	</p>
</ChatBot>
<ChatBot delay={1400}>
	<p>
		Bei Fragen oder Problemen wenden Sie sich bitte an die Teilnehmendenbetreuung des Projektes. Sie
		finden die Kontaktdaten auf der Website.
	</p>
</ChatBot>

<EndOfChat delay={2000}></EndOfChat>
