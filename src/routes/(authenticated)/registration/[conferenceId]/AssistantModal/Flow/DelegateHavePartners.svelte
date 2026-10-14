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
	<p>{m.assistantFlowDelegateHavePartners1()}</p>
	<p>{m.assistantFlowDelegateHavePartners2()}</p>
</ChatBot>
<ChatBot delay={1400}>
	<p>{m.assistantFlowDelegateHavePartners3()}</p>
</ChatBot>

<Question
	{advance}
	delay={2400}
	answers={[
		{
			icon: 'check',
			title: 'Ja',
			class: 'btn-success',
			reply: m.yes(),
			next: QuestionFlowState.Q_PARTNERS_CREATED_DELEGATION
		},
		{
			icon: 'xmark',
			title: 'Nein',
			class: 'btn-warning',
			reply: m.no(),
			next: QuestionFlowState.FINAL_INDIVIDUAL_DELEGATE
		}
	]}
/>
