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
				advance(QuestionFlowState.Q_PARTNERS_CREATED_DELEGATION);
			}
		},
		{
			icon: 'xmark',
			title: 'Nein',
			class: 'btn-warning',
			onClick: () => {
				selection = Selection.NO;
				advance(QuestionFlowState.FINAL_INDIVIDUAL_DELEGATE);
			}
		}
	];
</script>

<ChatBot delay={400}>
	<p>Sehr schön! Der normale Bewerbungsprozess für Delegierte und Vertreter*innen von NAs ist auf Gruppenanmeldungen von mindestens 2 Personen ausgelegt.</p>
  <p>Wenn Sie keine Personen in Ihrem Umfeld kennen, die mit Ihnen teilnehmen möchten, ist das aber kein größeres Problem.</p>
</ChatBot>
<ChatBot delay={1400}>
	<p>Haben Sie Personen, mit denen Sie eine Gruppe bilden können?</p>
</ChatBot>

{#if selection == Selection.NONE && mounted}
	<Choice {choices} delay={2400}></Choice>
{:else if selection !== Selection.NONE && mounted}
	<ChatUser>
		{#if selection === Selection.YES}
			<p>Ja.</p>
		{/if}
		{#if selection === Selection.NO}
			<p>Nein, leider nicht.</p>
		{/if}
	</ChatUser>
{/if}
