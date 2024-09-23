<script lang="ts">
	import { onMount } from 'svelte';
	import ChatBot from '../ChatBot.svelte';
	import ChatUser from '../ChatUser.svelte';
	import Choice from '../Choice.svelte';
	import QuestionFlowState from '../flowEnum';
	import Collapse from '../Collapse.svelte';
	import * as m from '$lib/paraglide/messages.js';

	interface Props {
		advance: (q: QuestionFlowState) => void;
	}

	enum Selection {
		NONE,
		DELEGATE,
		NSA,
		PRESS,
		SPECIAL
	}

	let { advance }: Props = $props();

	let selection: Selection | undefined = $state(Selection.NONE);

	let mounted = $state(false);

	onMount(() => {
		mounted = true;
	});

	const choices = [
		{
			icon: 'user-tie',
			title: m.assistantFlowRoleDelegate1(),
			onClick: () => {
				selection = Selection.DELEGATE;
				advance(QuestionFlowState.Q_DELEGATE_HAVE_PARTNERS);
			}
		},
		{
			icon: 'megaphone',
			title: m.assistantFlowRoleNSA1(),
			onClick: () => {
				selection = Selection.NSA;
				advance(QuestionFlowState.Q_DELEGATE_HAVE_PARTNERS);
			}
		},
		{
			icon: 'newspaper',
			title: m.assistantFlowRolePress1(),
			onClick: () => {
				selection = Selection.PRESS;
				advance(QuestionFlowState.FINAL_INDIVIDUAL);
			}
		},
		{
			icon: 'gavel',
			title: m.assistantFlowRoleOther1(),
			onClick: () => {
				selection = Selection.SPECIAL;
				advance(QuestionFlowState.FINAL_INDIVIDUAL);
			}
		}
	];
</script>

<ChatBot delay={400}>
	<p>{m.assistantFlowRole1()}</p>
</ChatBot>
<ChatBot delay={1400}>
	<p>{m.assistantFlowRole2()}</p>
	<Collapse title={m.assistantFlowRoleDelegate1()}>
		<p>{@html m.assistantFlowRoleDelegate2()}</p>
	</Collapse>
	<Collapse title={m.assistantFlowRoleNSA1()}>
		<p>{@html m.assistantFlowRoleNSA2()}</p>
		<p>{m.assistantFlowRoleNSA3()}</p>
	</Collapse>
	<Collapse title={m.assistantFlowRolePress1()}>
		<p>{m.assistantFlowRolePress2()}</p>
		<p>{m.assistantFlowRolePress3()}</p>
	</Collapse>
	<Collapse title={m.assistantFlowRoleOther1()}>
		<p>{@html m.assistantFlowRoleOther2()}</p>
		<p>{m.assistantFlowRoleOther3()}</p>
	</Collapse>
</ChatBot>

{#if selection == Selection.NONE && mounted}
	<Choice {choices} delay={2000}></Choice>
{:else if selection !== Selection.NONE && mounted}
	<ChatUser>
		{#if selection === Selection.DELEGATE}
			<p>{m.assistantFlowRoleAnswer1()}</p>
		{/if}
		{#if selection === Selection.NSA}
			<p>{m.assistantFlowRoleAnswer2()}</p>
		{/if}
		{#if selection === Selection.PRESS}
			<p>{m.assistantFlowRoleAnswer3()}</p>
		{/if}
		{#if selection === Selection.SPECIAL}
			<p>{m.assistantFlowRoleAnswer4()}</p>
		{/if}
	</ChatUser>
{/if}
