<script lang="ts">
	import { onMount } from 'svelte';
	import ChatBot from '../ChatBot.svelte';
	import ChatUser from '../ChatUser.svelte';
	import Choice from '../Choice.svelte';
	import QuestionFlowState from '../flowEnum';

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
			title: 'Teilnehmende*r',
			class: 'btn-primary',
			onClick: () => {
				selection = Selection.DELEGATE;
				advance(QuestionFlowState.Q_ROLE);
			}
		},
		{
			icon: 'chalkboard-user',
			title: 'Betreuer*in',
			onClick: () => {
				selection = Selection.SUPERVISOR;
				advance(QuestionFlowState.Q_SUPERVISOR_USERS_ALREADY_REGISTERED);
			}
		}
	];
</script>

<ChatBot delay={200}>
	<p>Hallo! Ich bin der Anmeldeassistent vom MUNify Delegator.</p>
</ChatBot>
<ChatBot delay={1000}>
	<p>Möchten Sie sich als Teilnehmende*r oder als Betreuer*in anmelden?</p>
</ChatBot>

{#if selection == Selection.NONE && mounted}
	<Choice {choices} delay={2000}></Choice>
{:else if selection !== Selection.NONE && mounted}
	<ChatUser>
		{#if selection === Selection.DELEGATE}
			<p>Ich möchte mich als Teilnehmende*r anmelden.</p>
		{/if}
		{#if selection === Selection.SUPERVISOR}
			<p>Ich möchte mich als Betreuer*in anmelden.</p>
		{/if}
	</ChatUser>
{/if}
