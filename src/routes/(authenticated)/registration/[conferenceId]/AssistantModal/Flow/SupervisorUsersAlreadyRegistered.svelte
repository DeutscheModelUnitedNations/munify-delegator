<script lang="ts">
	import ChatBot from '../ChatBot.svelte';
	import Question from '../Question.svelte';
	import QuestionFlowState from '../flowEnum';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		advance: (q: QuestionFlowState) => void;
	}

	let { advance }: Props = $props();
</script>

<ChatBot delay={400}>
	<p>{m.assistantFlowSupervisorUsersAlreadyRegistered1()}</p>
	<p class="text-primary dark:text-warning">{m.assistantFlowSupervisorUsersAlreadyRegistered2()}</p>
</ChatBot>
<ChatBot delay={1400}>
	<p>{m.assistantFlowSupervisorUsersAlreadyRegistered3()}</p>
</ChatBot>

<Question
	{advance}
	delay={2400}
	answers={[
		{
			icon: 'check',
			title: 'Ja',
			class: 'btn-success',
			reply: m.assistantFlowSupervisorUsersAlreadyRegisteredAnswer1(),
			next: QuestionFlowState.FINAL_SUPERVISOR
		},
		{
			icon: 'xmark',
			title: 'Nein',
			class: 'btn-warning',
			reply: m.assistantFlowSupervisorUsersAlreadyRegisteredAnswer2(),
			next: QuestionFlowState.FINAL_SUPERVISOR_ANSWER_WAIT
		}
	]}
/>
