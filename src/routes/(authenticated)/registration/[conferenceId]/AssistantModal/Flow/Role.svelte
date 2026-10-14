<script lang="ts">
	import ChatBot from '../ChatBot.svelte';
	import Question from '../Question.svelte';
	import QuestionFlowState from '../flowEnum';
	import Collapse from '../Collapse.svelte';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		advance: (q: QuestionFlowState) => void;
	}

	let { advance }: Props = $props();
</script>

<ChatBot delay={400}>
	<p>{m.assistantFlowRole1()}</p>
</ChatBot>
<ChatBot delay={1400}>
	<p>{m.assistantFlowRole2()}</p>
	<Collapse title={m.assistantFlowRoleDelegate1()}>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation string authored in messages/ -->
		<p>{@html m.assistantFlowRoleDelegate2()}</p>
	</Collapse>
	<Collapse title={m.assistantFlowRoleNSA1()}>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation string authored in messages/ -->
		<p>{@html m.assistantFlowRoleNSA2()}</p>
		<p>{m.assistantFlowRoleNSA3()}</p>
	</Collapse>
	<Collapse title={m.journalist()}>
		<p>{m.assistantFlowRolePress2()}</p>
		<p>{m.assistantFlowRolePress3()}</p>
	</Collapse>
	<Collapse title={m.assistantFlowRoleOther1()}>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation string authored in messages/ -->
		<p>{@html m.assistantFlowRoleOther2()}</p>
		<p>{m.assistantFlowRoleOther3()}</p>
	</Collapse>
</ChatBot>

<Question
	{advance}
	delay={2000}
	answers={[
		{
			icon: 'user-tie',
			title: m.assistantFlowRoleDelegate1(),
			reply: m.assistantFlowRoleAnswer1(),
			next: QuestionFlowState.Q_DELEGATE_HAVE_PARTNERS
		},
		{
			icon: 'megaphone',
			title: m.assistantFlowRoleNSA1(),
			reply: m.assistantFlowRoleAnswer2(),
			next: QuestionFlowState.Q_DELEGATE_HAVE_PARTNERS
		},
		{
			icon: 'newspaper',
			title: m.journalist(),
			reply: m.assistantFlowRoleAnswer3(),
			next: QuestionFlowState.FINAL_INDIVIDUAL
		},
		{
			icon: 'gavel',
			title: m.assistantFlowRoleOther1(),
			reply: m.assistantFlowRoleAnswer4(),
			next: QuestionFlowState.FINAL_INDIVIDUAL
		}
	]}
/>
