<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { confirmDialog, promptDialog } from '#lib/state/dialogs.svelte.js';
	import { genericPromiseToastMessages } from '#lib/utils/toast';

	const seriesList = $derived(
		await client.liveQuery.conferenceSeriesList({
			name: true,
			abbreviation: true,
			conferences: { title: true }
		})
	);

	let name = $state('');
	let abbreviation = $state('');

	async function add(event: SubmitEvent) {
		event.preventDefault();
		const promise = client.mutate.createConferenceSeries({
			__args: { name: name.trim(), abbreviation: abbreviation.trim() },
			name: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		name = '';
		abbreviation = '';
	}

	async function rename(series: { id: string; name: string }) {
		const next = await promptDialog({
			title: m.conferenceSeriesRename(),
			text: m.conferenceSeriesName(),
			initialValue: series.name
		});
		if (!next?.trim()) return;
		toast.promise(
			client.mutate.updateConferenceSeries({
				__args: { id: series.id, name: next.trim() },
				name: true
			}),
			genericPromiseToastMessages
		);
	}

	async function remove(series: { id: string; name: string }) {
		if (
			!(await confirmDialog({
				text: m.conferenceSeriesDeleteConfirm({ name: series.name }),
				danger: true
			}))
		) {
			return;
		}
		toast.promise(
			Promise.resolve(client.mutate.deleteConferenceSeries({ __args: { id: series.id } })),
			genericPromiseToastMessages
		);
	}
</script>

<ul class="flex flex-col gap-2" data-testid="conference-series-list">
	{#each seriesList as series (series.id)}
		<li class="rounded-box border-base-300 flex flex-wrap items-center gap-2 border p-3">
			<span class="font-semibold">{series.name}</span>
			<span class="badge badge-sm">{series.abbreviation}</span>
			<span class="min-w-0 flex-1 text-sm opacity-70">
				{series.conferences.map((conference) => conference.title).join(', ') ||
					m.conferenceSeriesNoConferences()}
			</span>
			<button class="btn btn-xs" onclick={() => rename(series)}>{m.conferenceSeriesRename()}</button
			>
			<button
				class="btn btn-xs btn-error btn-outline"
				aria-label={m.delete()}
				onclick={() => remove(series)}
			>
				<i class="ph-duotone ph-trash" aria-hidden="true"></i>
			</button>
		</li>
	{:else}
		<li class="alert">{m.conferenceSeriesNone()}</li>
	{/each}
</ul>

<form class="rounded-box border-base-300 flex flex-wrap items-end gap-2 border p-3" onsubmit={add}>
	<label class="fieldset min-w-0 flex-1">
		<span class="fieldset-legend">{m.conferenceSeriesName()}</span>
		<input class="input w-full" bind:value={name} required maxlength="100" placeholder="MUN-SH" />
	</label>
	<label class="fieldset w-40">
		<span class="fieldset-legend">{m.conferenceSeriesAbbreviation()}</span>
		<input
			class="input w-full"
			bind:value={abbreviation}
			required
			maxlength="100"
			placeholder="SH"
		/>
	</label>
	<button class="btn btn-primary" type="submit" disabled={!name.trim() || !abbreviation.trim()}>
		<i class="ph-duotone ph-plus" aria-hidden="true"></i>
		{m.conferenceSeriesAdd()}
	</button>
</form>
