<script lang="ts">
	import ChatBot from '../ChatBot.svelte';
	import EndOfChat from '../EndOfChat.svelte';
	import { m } from '$lib/paraglide/messages';
</script>

<ChatBot delay={400}>
	<p>{m.assistantFlowFinalSupervisorAnswerWait1()}</p>
	<p>{m.assistantFlowFinalSupervisorAnswerWait2()}</p>
</ChatBot>
<ChatBot delay={1400}>
	<p>{m.assistantFlowFinalSupervisorAnswerWait3()}</p>
</ChatBot>

<EndOfChat delay={2000}></EndOfChat>
