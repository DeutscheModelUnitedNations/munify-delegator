<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import DashboardSection from '#lib/components/dashboard/DashboardSection.svelte';
	import TodoTable from '#lib/components/dashboard/TodoTable.svelte';

	/**
	 * The registration's to-do list and the button that completes it, enabled once at most the final
	 * step is left.
	 */
	interface Props {
		description: string;
		todos: ComponentProps<typeof TodoTable>['todos'];
		/** Set when the caller may not complete the registration themselves. */
		forbidden?: boolean;
		onComplete: () => void;
	}

	let { description, todos, forbidden = false, onComplete }: Props = $props();

	const doneCount = $derived(todos.filter((x) => x.completed).length);
</script>

<DashboardSection icon="list-check" title={m.completeSignup()} {description}>
	<div class="mb-2 flex flex-col gap-1">
		<p class="text-sm font-medium">
			{m.registrationTasksDone({ done: doneCount, total: todos.length })}
		</p>
		<progress class="progress progress-primary w-full" value={doneCount} max={todos.length}
		></progress>
	</div>
	<TodoTable {todos} />
	<button
		class="btn btn-success mt-4"
		disabled={todos.filter((x) => x.completed === false).length > 1 || forbidden}
		onclick={onComplete}
	>
		{m.completeSignupButton()}
	</button>
</DashboardSection>
