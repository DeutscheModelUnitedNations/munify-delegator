<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { RAW_DATA_KEY } from './local_storage_keys';
	import { graphql } from '$houdini';

	let projects: {
		id: string;
		fileName: string;
		created: string;
		data: Record<string, any>;
	}[] = $state([]);

	let files: FileList | undefined = $state();
	let content:
		| {
				fileName: string;
				data: Record<string, any>;
		  }
		| undefined = $state();

	onMount(() => {
		const p = localStorage.getItem(RAW_DATA_KEY);
		if (!p) return;
		projects = JSON.parse(p);
	});

	$effect(() => {
		if (files) {
			for (const f of files) {
				readFile(f);
			}
		}
	});

	function readFile(file: File) {
		const reader = new FileReader();

		reader.onload = (event) => {
			const fileContent = event.target?.result;
			if (typeof fileContent === 'string') {
				try {
					const jsonData = JSON.parse(fileContent);
					content = {
						fileName: file.name,
						data: jsonData
					};
				} catch (error) {
					console.error('Error parsing JSON:', error);
				}
			}
		};

		reader.onerror = (event) => {
			console.error('Error reading file:', event);
		};

		// Read the file as text
		reader.readAsText(file);
	}

	const startWithNew = () => {
		if (!content) return;
		const id = Math.random().toString(36).substring(7);
		projects.push({
			id: id,
			created: new Date().toISOString(),
			...content
		});
		localStorage.setItem(RAW_DATA_KEY, JSON.stringify(projects));
		goto(`/assignment-assistant/${id}`);
	};

	const deleteProject = (id: string) => {
		projects = projects.filter((p) => p.id !== id);
		localStorage.setItem(RAW_DATA_KEY, JSON.stringify(projects));
	};
</script>

<main class="flex min-h-screen w-full flex-col items-center justify-center text-center">
	<h1 class="text-2xl font-bold">Assignment Assistant</h1>
	<div class="my-10 flex flex-col gap-2">
		<input
			bind:files
			type="file"
			accept=".json"
			class="file-input file-input-bordered file-input-lg w-full max-w-xs"
		/>
		<button class="btn btn-primary {!content && 'btn-disabled'}" onclick={startWithNew}>
			Start Assistant
			<i class="fas fa-arrow-right"></i>
		</button>
	</div>

	{#if projects.length !== 0}
		<div class="flex flex-col gap-2">
			<h2 class="text-xl font-bold">Gespeicherte Projekte</h2>
			<p>Da weitermachen, wo du aufgehört hast</p>
			<table class="table">
				<thead>
					<tr>
						<th>Datei</th>
						<th>Erstellt</th>
					</tr>
				</thead>
				<tbody>
					{#each projects as project}
						<tr>
							<td>{project.fileName}</td>
							<td>{project.created}</td>
							<td class="flex gap-2">
								<button
									class="btn btn-error btn-sm"
									onclick={() => deleteProject(project.id)}
									aria-label="Delete"
								>
									<i class="fas fa-trash"></i>
								</button>
								<a class="btn btn-primary btn-sm" href={`/assignment-assistant/${project.id}`}>
									Weiter
									<i class="fas fa-arrow-right"></i>
								</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</main>
