<script lang="ts">
	import { untrack } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import ActionModal from '#lib/components/ActionModal.svelte';
	import { client } from '#lib/api/rumbleClient/client';
	import LabeledField from '#lib/components/form/LabeledField.svelte';
	import { saveWithToast } from '#lib/helpers/saveWithToast';
	import { m } from '#lib/paraglide/messages';
	import { trackFields } from './calendarEditing';
	import type { MatrixDay, MatrixTrack } from './trackMatrix';

	interface Props {
		conferenceId: string;
		days: MatrixDay[];
		tracks: MatrixTrack[];
		/** The track to edit; a new one runs on every day when this is left out */
		track?: MatrixTrack;
		onClose: () => void;
	}

	let { conferenceId, days, tracks, track, onClose }: Props = $props();

	// Seeded once: re-reading the track while someone types would discard their edits
	let name = $state(untrack(() => track?.name ?? ''));
	let description = $state(untrack(() => track?.description ?? ''));
	const committeeIds = new SvelteSet(untrack(() => track?.committees.map((c) => c.id) ?? []));
	const roleIds = new SvelteSet(untrack(() => track?.conferenceRoles.map((r) => r.id) ?? []));
	let isLoading = $state(false);

	// Whom a track can be for: the committees, and the roles that are not a nation (a nation's
	// delegates sit in committees, which name them already).
	const [committees, roles] = await Promise.all([
		client.query.committees({
			__args: { where: { conferenceId: { eq: untrack(() => conferenceId) } } },
			id: true,
			name: true,
			abbreviation: true
		}),
		client.query.conferenceRoles({
			__args: {
				where: {
					conferenceId: { eq: untrack(() => conferenceId) },
					kind: { in: ['NON_STATE_ACTOR', 'CUSTOM'] }
				}
			},
			id: true,
			name: true
		})
	]);

	async function writeTrack() {
		const seats = { committeeIds: [...committeeIds], conferenceRoleIds: [...roleIds] };
		if (track) {
			await client.mutate.updateCalendarTrack({
				__args: {
					id: track.id,
					...trackFields({ name, description, sortOrder: track.sortOrder }),
					...seats
				},
				id: true
			});
			return;
		}
		await client.mutate.createCalendarTrack({
			__args: {
				conferenceId,
				...trackFields({ name, description, sortOrder: tracks.length }),
				calendarDayIds: days.map((day) => day.id),
				...seats
			},
			id: true
		});
	}

	async function save() {
		if (!name) return;
		if (await saveWithToast({ setLoading: (loading) => (isLoading = loading), write: writeTrack }))
			onClose();
	}

	const toggle = ({ set, id }: { set: SvelteSet<string>; id: string }) =>
		set.has(id) ? set.delete(id) : set.add(id);
</script>

{#snippet choices(legend: string, options: { id: string; label: string }[], set: SvelteSet<string>)}
	{#if options.length > 0}
		<fieldset class="fieldset">
			<legend class="fieldset-legend">{legend}</legend>
			<div class="flex flex-wrap gap-x-4 gap-y-1">
				{#each options as option (option.id)}
					<label class="label cursor-pointer gap-2">
						<input
							type="checkbox"
							class="checkbox checkbox-sm checkbox-primary"
							checked={set.has(option.id)}
							onchange={() => toggle({ set, id: option.id })}
						/>
						{option.label}
					</label>
				{/each}
			</div>
		</fieldset>
	{/if}
{/snippet}

<ActionModal
	title={track ? m.calendarEditTrack() : m.calendarAddTrack()}
	confirmLabel={track ? m.save() : m.create()}
	confirmDisabled={!name}
	loading={isLoading}
	onConfirm={save}
	{onClose}
>
	<LabeledField label={m.name()} bind:value={name} required />
	<LabeledField label={m.description()} bind:value={description} multiline />
	<p class="text-base-content/60 text-sm">{m.calendarTrackSeatsHint()}</p>
	{@render choices(
		m.committees(),
		committees.map((c) => ({ id: c.id, label: `${c.abbreviation} · ${c.name}` })),
		committeeIds
	)}
	{@render choices(
		m.calendarTrackRoles(),
		roles.map((r) => ({ id: r.id, label: r.name ?? '' })),
		roleIds
	)}
</ActionModal>
