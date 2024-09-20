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
			title: 'Zur Anmeldung',
			class: 'btn-primary',
			href: `${conferenceId}/create`
		}
	];
</script>

<ChatBot delay={400}>
	<p>{m.assistantFlowFinalCreateDelegation1()}</p>
	<p>{m.assistantFlowFinalCreateDelegation2()}</p>
</ChatBot>
<ChatBot delay={1400}>
	<p>{m.assistantFlowFinalCreateDelegation3()}</p>
</ChatBot>
<ChatBot delay={2400}>
	<p>{m.assistantFlowFinalCreateDelegation4()}</p>
</ChatBot>

<Choice {choices} delay={3400}></Choice>

<EndOfChat delay={4000}></EndOfChat>
