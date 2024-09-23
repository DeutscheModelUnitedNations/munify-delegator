<script lang="ts">
	import ChatBot from '../ChatBot.svelte';
	import Choice from '../Choice.svelte';
	import EndOfChat from '../EndOfChat.svelte';
	import * as m from '$lib/paraglide/messages.js';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	const choices = [
		{
			icon: 'arrow-right',
			title: {m.individualApplication()},
			class: 'btn-primary',
			href: `${conferenceId}/individual`
		}
	];
</script>

<ChatBot delay={400}>
	<p>{m.assistantFlowFinalIndividualDelegate1()}</p>
	<p>{@html m.assistantFlowFinalIndividualDelegate2()}</p>
</ChatBot>
<ChatBot delay={1400}>
	<p>{m.assistantFlowFinalIndividualDelegate3()}</p>
	<p>{m.assistantFlowFinalIndividualDelegate4()}</p>
</ChatBot>
<ChatBot delay={2400}>
	<p>{m.assistantFlowFinalIndividualDelegate5()}</p>
</ChatBot>

<Choice {choices} delay={3400}></Choice>

<EndOfChat delay={4000}></EndOfChat>
