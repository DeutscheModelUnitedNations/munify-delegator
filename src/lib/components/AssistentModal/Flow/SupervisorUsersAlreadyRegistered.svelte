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
	<p>Sehr schön! Als Betreuende Person können sie nur bereits erstellte Delegationen überwachen.</p>
	<p class="text-primary dark:text-warning">
		Wichtig: Anders als früher müssen Ihre Schüler*innen die Delegation selbst erstellen. Sie können
		den Delegationen anschließend mit dem Delegationscode als betreuende Person beitreten.
	</p>
</ChatBot>
<ChatBot delay={1400}>
	<p>Haben Ihre Schüler*innen bereits Delegationen erstellt?</p>
</ChatBot>

{#if selection == Selection.NONE && mounted}
	<Choice {choices} delay={2400}></Choice>
{:else if selection !== Selection.NONE && mounted}
	<ChatUser>
		{#if selection === Selection.YES}
			<p>Ja, haben sie.</p>
		{/if}
		{#if selection === Selection.NO}
			<p>Nein, noch nicht.</p>
		{/if}
	</ChatUser>
{/if}
