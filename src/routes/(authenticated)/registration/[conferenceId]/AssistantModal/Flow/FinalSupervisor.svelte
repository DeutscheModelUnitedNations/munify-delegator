<script lang="ts">
	import ChatBot from '../ChatBot.svelte';
	import Choice from '../Choice.svelte';
	import EndOfChat from '../EndOfChat.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { resolve } from '$app/paths';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	const choices = $derived([
		{
			icon: 'arrow-right',
			title: 'Zur Bewerbung',
			class: 'btn-primary',
			href: resolve(`registration/${conferenceId}/supervisor`)
		}
	]);
</script>

<ChatBot delay={400}>
	<p>{m.assistantFlowFinalSupervisor1()}</p>
	<p>{m.assistantFlowFinalSupervisor2()}</p>
</ChatBot>

<ChatBot delay={1400}><p>{m.assistantFlowFinalSupervisor3()}</p></ChatBot>
<ChatBot delay={2400}><p>{m.assistantFlowFinalSupervisor4()}</p></ChatBot>
<Choice {choices} delay={3400} />
<EndOfChat delay={4000} />
