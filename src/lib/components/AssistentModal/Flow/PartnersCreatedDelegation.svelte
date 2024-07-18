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
				advance(QuestionFlowState.FINAL_JOIN_DELEGATION);
			}
		},
		{
			icon: 'xmark',
			title: 'Nein',
			class: 'btn-warning',
			onClick: () => {
				selection = Selection.NO;
				advance(QuestionFlowState.FINAL_CREATE_DELEGATION);
			}
		}
	];
</script>

<ChatBot delay={400}>
	<p>Wunderbar! Dann sind Sie hier genau richtig.</p>
  <p>Da die Anmeldung als Gruppe auch geschlossen stattfinden muss, müssen Sie zunächst klären, ob schon jemand Ihrer Gruppe eine Delegation erstellt hat, der sie beitreten können.</p>
  <p>Der/die Ersteller*in einer Delegation wird automatisch zur Delegationsleiter*in</p>
</ChatBot>
<ChatBot delay={1400}>
	<p>Haben sie schon eine*n Delegationsleiter*in, der/die bereits eine Delegation erstellt hat?</p>
</ChatBot>

{#if selection == Selection.NONE && mounted}
	<Choice {choices} delay={2400}></Choice>
{:else if selection !== Selection.NONE && mounted}
	<ChatUser>
		{#if selection === Selection.YES}
			<p>Ja, es gibt bereits eine Delegation.</p>
		{/if}
		{#if selection === Selection.NO}
			<p>Nein, noch hat niemand eine Delegation erstellt.</p>
		{/if}
	</ChatUser>
{/if}
