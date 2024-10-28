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

	const Selections = [
		"NONE",
		"DELEGATE",
		"NSA",
		"PRESS",
		"SPECIAL"
	] as const

	let { advance }: Props = $props();

	let selection: typeof Selections[number] | undefined = $state("NONE");

	let mounted = $state(false);

	onMount(() => {
		mounted = true;
	});

	const choices = [
		{
			icon: 'user-tie',
			title: m.assistantFlowRoleDelegate1(),
			onClick: () => {
				selection = "DELEGATE";
				advance(QuestionFlowState.Q_DELEGATE_HAVE_PARTNERS);
			}
		},
		{
			icon: 'megaphone',
			title: m.assistantFlowRoleNSA1(),
			onClick: () => {
				selection = "NSA";
				advance(QuestionFlowState.Q_DELEGATE_HAVE_PARTNERS);
			}
		},
		{
			icon: 'newspaper',
			title: m.journalist(),
			onClick: () => {
				selection = "PRESS";
				advance(QuestionFlowState.FINAL_INDIVIDUAL);
			}
		},
		{
			icon: 'gavel',
			title: m.assistantFlowRoleOther1(),
			onClick: () => {
				selection = "SPECIAL";
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
	<Collapse title={m.journalist()}>
		<p>{m.assistantFlowRolePress2()}</p>
		<p>{m.assistantFlowRolePress3()}</p>
	</Collapse>
	<Collapse title={m.assistantFlowRoleOther1()}>
		<p>{@html m.assistantFlowRoleOther2()}</p>
		<p>{m.assistantFlowRoleOther3()}</p>
	</Collapse>
</ChatBot>

{#if selection == "NONE" && mounted}
	<Choice {choices} delay={2000}></Choice>
{:else if selection !== "NONE" && mounted}
	<ChatUser>
		{#if selection === "DELEGATE"}
			<p>{m.assistantFlowRoleAnswer1()}</p>
		{/if}
		{#if selection === "NSA"}
			<p>{m.assistantFlowRoleAnswer2()}</p>
		{/if}
		{#if selection === "PRESS"}
			<p>{m.assistantFlowRoleAnswer3()}</p>
		{/if}
		{#if selection === "SPECIAL"}
			<p>{m.assistantFlowRoleAnswer4()}</p>
		{/if}
	</ChatUser>
{/if}
