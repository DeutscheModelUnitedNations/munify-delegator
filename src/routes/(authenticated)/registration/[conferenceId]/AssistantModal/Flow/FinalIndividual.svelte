<script lang="ts">
	import ChatBot from '../ChatBot.svelte';
	import Choice from '../Choice.svelte';
	import EndOfChat from '../EndOfChat.svelte';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	const choices = [
		{
			icon: 'arrow-right',
			title: m.individualApplication(),
			class: 'btn-primary',
			href: `${conferenceId}/individual`
		}
	];
</script>

<ChatBot delay={400}>
	<p>{@html m.assistantFlowFinalIndividual1()}</p>
</ChatBot>
<ChatBot delay={1400}>
	<p>{m.assistantFlowFinalIndividual2()}</p>
	<p>{m.assistantFlowFinalIndividual3()}</p>
</ChatBot>
<ChatBot delay={2400}>
	<p>{m.assistantFlowFinalIndividual4()}</p>
</ChatBot>

<Choice {choices} delay={3400}></Choice>

<EndOfChat delay={4000}></EndOfChat>
