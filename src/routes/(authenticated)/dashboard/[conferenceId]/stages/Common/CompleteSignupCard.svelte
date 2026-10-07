<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import { m } from '$lib/paraglide/messages';
	import DashboardContentCard from '$lib/components/dashboard/DashboardContentCard.svelte';
	import TodoTable from '$lib/components/dashboard/TodoTable.svelte';

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
</script>

<DashboardContentCard title={m.completeSignup()} {description}>
	<TodoTable {todos} />
	<button
		class="btn btn-success mt-4"
		disabled={todos.filter((x) => x.completed === false).length > 1 || forbidden}
		onclick={onComplete}
	>
		{m.completeSignupButton()}
	</button>
</DashboardContentCard>
