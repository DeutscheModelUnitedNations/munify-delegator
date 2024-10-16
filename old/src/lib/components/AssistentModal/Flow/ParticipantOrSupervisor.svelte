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
		DELEGATE,
		SUPERVISOR
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
			title: m.assistantFlowParticipantOrSupervisorAnswer1(),
			class: 'btn-primary',
			onClick: () => {
				selection = Selection.DELEGATE;
				advance(QuestionFlowState.Q_ROLE);
			}
		},
		{
			icon: 'chalkboard-user',
			title: m.assistantFlowParticipantOrSupervisorAnswer2(),
			onClick: () => {
				selection = Selection.SUPERVISOR;
				advance(QuestionFlowState.Q_SUPERVISOR_USERS_ALREADY_REGISTERED);
			}
		}
	];
</script>

<ChatBot delay={200}>
	<p>{m.assistantFlowParticipantOrSupervisor1()}</p>
</ChatBot>
<ChatBot delay={1000}>
	<p>{m.assistantFlowParticipantOrSupervisor2()}</p>
</ChatBot>

{#if selection == Selection.NONE && mounted}
	<Choice {choices} delay={2000}></Choice>
{:else if selection !== Selection.NONE && mounted}
	<ChatUser>
		{#if selection === Selection.DELEGATE}
			<p>{m.assistantFlowParticipantOrSupervisorAnswer1()}</p>
		{/if}
		{#if selection === Selection.SUPERVISOR}
			<p>{m.assistantFlowParticipantOrSupervisorAnswer2()}</p>
		{/if}
	</ChatUser>
{/if}
