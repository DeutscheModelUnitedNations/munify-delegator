<script lang="ts">
	import { onMount } from 'svelte';
	import ChatBot from '../ChatBot.svelte';
	import ChatUser from '../ChatUser.svelte';
	import Choice from '../Choice.svelte';
	import QuestionFlowState from '../flowEnum';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		advance: (q: QuestionFlowState) => void;
	}

	const Selections = ['NONE', 'YES', 'NO'] as const;

	let { advance }: Props = $props();

	let selection: (typeof Selections)[number] | undefined = $state('NONE');

	let mounted = $state(false);

	onMount(() => {
		mounted = true;
	});

	const choices = [
		{
			icon: 'check',
			title: 'Ja',
			class: 'btn-success',
			onClick: () => {
				selection = 'YES';
				advance(QuestionFlowState.Q_PARTNERS_CREATED_DELEGATION);
			}
		},
		{
			icon: 'xmark',
			title: 'Nein',
			class: 'btn-warning',
			onClick: () => {
				selection = 'NO';
				advance(QuestionFlowState.FINAL_INDIVIDUAL_DELEGATE);
			}
		}
	];
</script>

<ChatBot delay={400}>
	<p>{m.assistantFlowDelegateHavePartners1()}</p>
	<p>{m.assistantFlowDelegateHavePartners2()}</p>
</ChatBot>
<ChatBot delay={1400}>
	<p>{m.assistantFlowDelegateHavePartners3()}</p>
</ChatBot>

{#if selection == 'NONE' && mounted}
	<Choice {choices} delay={2400}></Choice>
{:else if selection !== 'NONE' && mounted}
	<ChatUser>
		{#if selection === 'YES'}
			<p>{m.yes()}</p>
		{/if}
		{#if selection === 'NO'}
			<p>{m.no()}</p>
		{/if}
	</ChatUser>
{/if}
