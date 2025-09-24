<script lang="ts">
	interface Props {
		todos: (
			| {
					title: string;
					completed: boolean | undefined;
					help?: string;
					helpLink?: undefined;
					arrowDown?: boolean;
			  }
			| {
					title: string;
					completed: boolean | undefined;
					helpLink?: string;
					help?: undefined;
					arrowDown?: boolean;
			  }
		)[];
	}

	let { todos }: Props = $props();
</script>

<table class="table">
	<thead>
		<tr>
			<th class="text-center"></th>
			<th class="w-full"></th>
			<th class="text-right"></th>
		</tr>
	</thead>
	<tbody>
		{#each todos as todo}
			<tr>
				<td>
					{#if todo.completed}
						<i class="fas fa-square-check text-primary w-6 text-center text-2xl"></i>
					{:else if todo.completed === false}
						{#if todo.arrowDown}
							<i class="fa-duotone fa-arrow-down point-down w-6 text-center text-2xl"></i>
						{:else}
							<i class="fas fa-square text-error w-6 text-center text-2xl"></i>
						{/if}
					{:else}
						<span class="loading loading-spinner loading-sm"></span>
					{/if}
				</td>
				<td>{todo.title}</td>
				<td>
					{#if todo.helpLink}
						<a
							href={todo.helpLink}
							target="_blank"
							class="btn btn-circle btn-sm"
							aria-label="Help-Link"
						>
							<i class="fad fa-question"></i>
						</a>
					{:else if todo.help}
						<div class="tooltip tooltip-left" data-tip={todo.help}>
							<button class="btn btn-circle btn-sm cursor-help" aria-label="Help">
								<i class="fad fa-question"></i>
							</button>
						</div>
					{/if}
				</td>
			</tr>
		{/each}
	</tbody>
</table>

<style>
	.point-down {
		animation: point-down 1s infinite;
	}

	@keyframes point-down {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(5px);
		}
	}
</style>
