<script lang="ts">
	import { onMount } from 'svelte';
	import ChatBot from '../ChatBot.svelte';
	import ChatUser from '../ChatUser.svelte';
	import Choice from '../Choice.svelte';
	import QuestionFlowState from '../flowEnum';
	import * as m from '$lib/paraglide/messages.js';

	interface Props {
		advance: (q: QuestionFlowState) => void;
	}

	const Selections = ['NONE', 'YES', 'NO'] as const;

	let { advance }: Props = $props();

	let selection: typeof Selections[number] | undefined = $state("NONE");

	let mounted = $state(false);

	onMount(() => {
		mounted = true;
	});

	const choices = [
		{
			icon: 'check',
			title: m.assistantFlowPartnersCreatedDelegationAnswer1(),
			class: 'btn-success',
			onClick: () => {
				selection = "YES";
				advance(QuestionFlowState.FINAL_JOIN_DELEGATION);
			}
		},
		{
			icon: 'xmark',
			title: m.assistantFlowPartnersCreatedDelegationAnswer2(),
			class: 'btn-warning',
			onClick: () => {
				selection = "NO";
				advance(QuestionFlowState.FINAL_CREATE_DELEGATION);
			}
		}
	];
</script>

<ChatBot delay={400}>
	<p>{@html m.assistantFlowPartnersCreatedDelegation1()}</p>
	<p>{m.assistantFlowPartnersCreatedDelegation2()}</p>
	<p>{@html m.assistantFlowPartnersCreatedDelegation3()}</p>
</ChatBot>
<ChatBot delay={1400}>
	<p>{m.assistantFlowPartnersCreatedDelegation4()}</p>
</ChatBot>

{#if selection == "NONE" && mounted}
	<Choice {choices} delay={2400}></Choice>
{:else if selection !== "NONE" && mounted}
	<ChatUser>
		{#if selection === "YES"}
			<p>{m.assistantFlowPartnersCreatedDelegationAnswer1()}</p>
		{/if}
		{#if selection === "NO"}
			<p>{m.assistantFlowPartnersCreatedDelegationAnswer2()}</p>
		{/if}
	</ChatUser>
{/if}
