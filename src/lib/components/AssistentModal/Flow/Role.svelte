<script lang="ts">
	import { onMount } from 'svelte';
	import ChatBot from '../ChatBot.svelte';
	import ChatUser from '../ChatUser.svelte';
	import Choice from '../Choice.svelte';
	import QuestionFlowState from '../flowEnum';
	import Collapse from '../Collapse.svelte';

	interface Props {
		advance: (q: QuestionFlowState) => void;
	}

	enum Selection {
		NONE,
		DELEGATE,
		NSA,
		PRESS,
		SPECIAL
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
			title: 'Delegierte*r',
			onClick: () => {
				selection = Selection.DELEGATE;
				advance(QuestionFlowState.Q_DELEGATE_HAVE_PARTNERS);
			}
		},
		{
			icon: 'megaphone',
			title: 'Vertreter*in',
			onClick: () => {
				selection = Selection.NSA;
				advance(QuestionFlowState.Q_DELEGATE_HAVE_PARTNERS);
			}
		},
		{
			icon: 'newspaper',
			title: 'Journalist*in',
			onClick: () => {
				selection = Selection.PRESS;
				advance(QuestionFlowState.FINAL_INDIVIDUAL);
			}
		},
		{
			icon: 'gavel',
			title: 'Andere spezielle Rolle',
			onClick: () => {
				selection = Selection.SPECIAL;
				advance(QuestionFlowState.FINAL_INDIVIDUAL);
			}
		}
	];
</script>

<ChatBot delay={400}>
	<p>
		Wunderbar – herzlich Willkommen! Damit ich Sie richtig durch den Anmeldeprozess führen kann,
		verraten Sie mir doch, welche Rolle Sie gerne einnehmen möchten.
	</p>
</ChatBot>
<ChatBot delay={1400}>
	<p>Hier eine kleine Übersicht über Ihre Möglichkeiten inklusive Erläuterungen:</p>
	<Collapse title="Delegierte*r">
		<p>
			Als Delegierte*r vertreten Sie die konkreten Interessen eines Landes in einem der Gremien der
			Konferenz.
		</p>
	</Collapse>
	<Collapse title="Vertreter*in eine*r NA">
		<p>Als Vertreter*in eine*r Nichtstaatlichen Akteur*in (NA) vertreten Sie eine Organisation.</p>
		<p>
			Dabei sind Sie nicht an ein bestimmtes Gremium gebunden sondern können in den Gremien einfluss
			nehmen, die für Ihre Organisation die wichtigsten Themen behandeln
		</p>
	</Collapse>
	<Collapse title="Journalist*in">
		<p>Als Journalist*in der Konferenzpresse berichten Sie über die Geschehnisse in den Gremien.</p>
		<p>
			Sie schreiben Artikel und Kommentare und produzieren auch Fernsehnachrichten, die an den
			Abenden der Konferenz gezeigt werden.
		</p>
	</Collapse>
	<Collapse title="Andere spezielle Rolle">
		<p>
			Manchmal gibt es bei unseren Konferenzen auch noch spezielle Rollen, die nicht in die oben
			genannten Kategorien passen.
		</p>
		<p>Diese können zum Beispiel <em>Richter*in am IGH</em> sein.</p>
		<p>
			Ob es solche Angebote wie die Simulation einer Krise oder des Internationalen Gerichtshofs
			gibt, erfahren Sie auf der Website der Konferenz bzw. bei den Auswahlmöglichkeiten der
			Einzelanmeldung.
		</p>
	</Collapse>
</ChatBot>

{#if selection == Selection.NONE && mounted}
	<Choice {choices} delay={2000}></Choice>
{:else if selection !== Selection.NONE && mounted}
	<ChatUser>
		{#if selection === Selection.DELEGATE}
			<p>Ich möchte als Delegierte*r eines Landes teilnehmen.</p>
		{/if}
		{#if selection === Selection.NSA}
			<p>Ich möchte als Vertreter*in eines Nichtstaatlichen Akteurs teilnehmen.</p>
		{/if}
		{#if selection === Selection.PRESS}
			<p>Ich möchte als Journalist*in der Konferenzpresse teilnehmen.</p>
		{/if}
		{#if selection === Selection.SPECIAL}
			<p>Ich möchte eine andere spezielle Rolle einnehmen.</p>
		{/if}
	</ChatUser>
{/if}
