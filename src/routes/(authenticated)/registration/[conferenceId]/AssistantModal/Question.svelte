<script lang="ts">
	import { onMount } from 'svelte';
	import ChatUser from './ChatUser.svelte';
	import Choice from './Choice.svelte';
	import type QuestionFlowState from './flowEnum';

	/**
	 * The answer buttons of one assistant question. Once one is picked, the buttons give way to
	 * that answer as the user's chat bubble, and the flow advances to the answer's `next` step.
	 */
	interface Props {
		answers: {
			icon: string;
			/** The button label. */
			title: string;
			class?: string;
			/** What the user's chat bubble says once this answer is picked. */
			reply: string;
			next: QuestionFlowState;
		}[];
		advance: (q: QuestionFlowState) => void;
		delay: number;
	}

	let { answers, advance, delay }: Props = $props();

	let picked = $state<Props['answers'][number]>();

	let mounted = $state(false);

	onMount(() => {
		mounted = true;
	});

	let choices = $derived(
		answers.map((answer) => ({
			icon: answer.icon,
			title: answer.title,
			class: answer.class,
			onClick: () => {
				picked = answer;
				advance(answer.next);
			}
		}))
	);
</script>

{#if mounted}
	{#if picked}
		<ChatUser>
			<p>{picked.reply}</p>
		</ChatUser>
	{:else}
		<Choice {choices} {delay}></Choice>
	{/if}
{/if}
