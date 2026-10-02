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

<ChatBot delay={200}>
	<p>{m.assistantFlowParticipantOrSupervisor1()}</p>
</ChatBot>
<ChatBot delay={1000}>
	<p>{m.assistantFlowParticipantOrSupervisor2()}</p>
</ChatBot>

<Question
	{advance}
	delay={2000}
	answers={[
		{
			icon: 'user-tie',
			title: m.assistantFlowParticipantOrSupervisorAnswer1(),
			class: 'btn-primary',
			reply: m.assistantFlowParticipantOrSupervisorAnswer1(),
			next: QuestionFlowState.Q_ROLE
		},
		{
			icon: 'chalkboard-user',
			title: m.assistantFlowParticipantOrSupervisorAnswer2(),
			reply: m.assistantFlowParticipantOrSupervisorAnswer2(),
			next: QuestionFlowState.Q_SUPERVISOR_USERS_ALREADY_REGISTERED
		}
	]}
/>
