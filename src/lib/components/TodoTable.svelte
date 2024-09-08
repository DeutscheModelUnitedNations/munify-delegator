<script lang="ts">
	interface Props {
		todos: (
			| { title: string; completed: boolean | undefined; help?: string; helpLink?: undefined }
			| { title: string; completed: boolean | undefined; helpLink?: string; help?: undefined }
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
						<i class="fas fa-square-check text-2xl text-primary"></i>
					{:else if todo.completed === false}
						<i class="fas fa-square text-2xl text-error"></i>
					{:else}
						<span class="loading loading-spinner loading-sm"></span>
					{/if}
				</td>
				<td>{todo.title}</td>
				<td>
					{#if todo.helpLink}
						<a href={todo.helpLink} target="_blank" class="btn btn-circle btn-sm">
							<i class="fad fa-question"></i>
						</a>
					{:else if todo.help}
						<div class="tooltip tooltip-left" data-tip={todo.help}>
							<button class="btn btn-circle btn-sm cursor-help"
								><i class="fad fa-question"></i></button
							>
						</div>
					{/if}
				</td>
			</tr>
		{/each}
	</tbody>
</table>
