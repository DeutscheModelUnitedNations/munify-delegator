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

	enum Selection {
		NONE,
		YES,
		NO
	}

	let { advance }: Props = $props();

	let selection: Selection | undefined = $state(Selection.NONE);

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
				selection = Selection.YES;
				advance(QuestionFlowState.FINAL_SUPERVISOR);
			}
		},
		{
			icon: 'xmark',
			title: 'Nein',
			class: 'btn-warning',
			onClick: () => {
				selection = Selection.NO;
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

{#if selection == Selection.NONE && mounted}
	<Choice {choices} delay={2400}></Choice>
{:else if selection !== Selection.NONE && mounted}
	<ChatUser>
		{#if selection === Selection.YES}
			<p>{m.assistantFlowSupervisorUsersAlreadyRegisteredAnswer1()}</p>
		{/if}
		{#if selection === Selection.NO}
			<p>{m.assistantFlowSupervisorUsersAlreadyRegisteredAnswer1()}</p>
		{/if}
	</ChatUser>
{/if}
