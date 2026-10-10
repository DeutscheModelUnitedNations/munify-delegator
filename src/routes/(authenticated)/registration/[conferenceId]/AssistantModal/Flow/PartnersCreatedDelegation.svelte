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
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation string authored in messages/ -->
	<p>{@html m.assistantFlowPartnersCreatedDelegation1()}</p>
	<p>{m.assistantFlowPartnersCreatedDelegation2()}</p>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation string authored in messages/ -->
	<p>{@html m.assistantFlowPartnersCreatedDelegation3()}</p>
</ChatBot>
<ChatBot delay={1400}>
	<p>{m.assistantFlowPartnersCreatedDelegation4()}</p>
</ChatBot>

<Question
	{advance}
	delay={2400}
	answers={[
		{
			icon: 'check',
			title: m.assistantFlowPartnersCreatedDelegationAnswer1(),
			class: 'btn-success',
			reply: m.assistantFlowPartnersCreatedDelegationAnswer1(),
			next: QuestionFlowState.FINAL_JOIN_DELEGATION
		},
		{
			icon: 'xmark',
			title: m.assistantFlowPartnersCreatedDelegationAnswer2(),
			class: 'btn-warning',
			reply: m.assistantFlowPartnersCreatedDelegationAnswer2(),
			next: QuestionFlowState.FINAL_CREATE_DELEGATION
		}
	]}
/>
