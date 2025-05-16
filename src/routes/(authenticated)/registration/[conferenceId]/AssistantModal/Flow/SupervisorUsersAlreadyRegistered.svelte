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
				advance(QuestionFlowState.FINAL_SUPERVISOR);
			}
		},
		{
			icon: 'xmark',
			title: 'Nein',
			class: 'btn-warning',
			onClick: () => {
				selection = 'NO';
				advance(QuestionFlowState.FINAL_SUPERVISOR_ANSWER_WAIT);
			}
		}
	];
</script>

<ChatBot delay={400}>
	<p>{m.assistantFlowSupervisorUsersAlreadyRegistered1()}</p>
	<p class="text-primary dark:text-warning">{m.assistantFlowSupervisorUsersAlreadyRegistered2()}</p>
</ChatBot>
<ChatBot delay={1400}>
	<p>{m.assistantFlowSupervisorUsersAlreadyRegistered3()}</p>
</ChatBot>

{#if selection == 'NONE' && mounted}
	<Choice {choices} delay={2400}></Choice>
{:else if selection !== 'NONE' && mounted}
	<ChatUser>
		{#if selection === 'YES'}
			<p>{m.assistantFlowSupervisorUsersAlreadyRegisteredAnswer1()}</p>
		{/if}
		{#if selection === 'NO'}
			<p>{m.assistantFlowSupervisorUsersAlreadyRegisteredAnswer2()}</p>
		{/if}
	</ChatUser>
{/if}
