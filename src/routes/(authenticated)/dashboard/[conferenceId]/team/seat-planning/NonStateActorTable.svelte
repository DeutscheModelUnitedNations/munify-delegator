<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { isOutsideSizeLimits, type SizeLimits } from '#lib/helpers/seatPlanning/hints';
	import RoleAddButton from './RoleAddButton.svelte';
	import RoleDeleteModal from './RoleDeleteModal.svelte';
	import RoleIconInput from './RoleIconInput.svelte';
	import RoleInput from './RoleInput.svelte';
	import RoleSeatInput from './RoleSeatInput.svelte';
	import { saveField, showError } from './roleEditing';
	import type { SeatPlanner } from './seatPlanner.svelte';
	import type { NonStateActor } from './nonStateActors';

	interface Props {
		conferenceId: string;
		planner: SeatPlanner;
		nonStateActors: NonStateActor[];
		sizeLimits: SizeLimits;
	}

	let { conferenceId, planner, nonStateActors, sizeLimits }: Props = $props();

	const emptyDraft = () => ({
		name: '',
		abbreviation: '',
		description: '',
		fontAwesomeIcon: '',
		seatAmount: 2
	});

	let draft = $state(emptyDraft());
	let toDelete = $state<NonStateActor>();

	const draftValid = $derived(
		!!draft.name.trim() &&
			!!draft.abbreviation.trim() &&
			!!draft.description.trim() &&
			draft.seatAmount >= 1
	);

	/** saves one field; a refused change puts the saved value back into the input */
	const update = ({
		input,
		saved,
		id,
		data
	}: {
		input: HTMLInputElement;
		saved: string | number;
		id: string;
		data: Partial<Omit<NonStateActor, 'id'>>;
	}) =>
		saveField({
			input,
			saved,
			save: () => client.mutate.updateNonStateActor({ __args: { id, ...data }, seatAmount: true })
		});

	async function create() {
		if (!draftValid) return;
		try {
			await client.mutate.createNonStateActor({
				__args: { conferenceId, ...draft, fontAwesomeIcon: draft.fontAwesomeIcon || undefined },
				name: true
			});
		} catch (error) {
			showError(error);
			return;
		}
		draft = emptyDraft();
	}

	async function remove(id: string) {
		toDelete = undefined;
		try {
			await client.mutate.deleteNonStateActor({ __args: { id } });
		} catch (error) {
			showError(error);
		}
	}
</script>

<div class="border-base-300 overflow-x-auto rounded-box border">
	<table class="table-sm table">
		<thead>
			<tr>
				<th class="w-40">{m.seatPlanningIcon()}</th>
				<th>{m.name()}</th>
				<th class="w-28">{m.abbreviation()}</th>
				<th>{m.description()}</th>
				<th class="w-28">{m.seats()}</th>
				<th class="w-12"></th>
			</tr>
		</thead>
		<tbody>
			{#each nonStateActors as nsa (nsa.id)}
				{@const members = planner.nonStateActorMemberCount(nsa.id)}
				{@const outsideLimits = isOutsideSizeLimits({ size: nsa.seatAmount, limits: sizeLimits })}
				<tr class={outsideLimits ? 'bg-error/10' : ''}>
					<td>
						<RoleIconInput
							class="min-w-24"
							value={nsa.fontAwesomeIcon ?? ''}
							onchange={(e) =>
								update({
									input: e.currentTarget,
									saved: nsa.fontAwesomeIcon ?? '',
									id: nsa.id,
									data: {
										fontAwesomeIcon: e.currentTarget.value
									}
								})}
						/>
					</td>
					<td>
						<RoleInput
							class="min-w-36"
							label={m.name()}
							required
							value={nsa.name}
							onchange={(e) =>
								update({
									input: e.currentTarget,
									saved: nsa.name,
									id: nsa.id,
									data: { name: e.currentTarget.value }
								})}
						/>
					</td>
					<td>
						<RoleInput
							class="min-w-20"
							label={m.abbreviation()}
							required
							value={nsa.abbreviation}
							onchange={(e) =>
								update({
									input: e.currentTarget,
									saved: nsa.abbreviation,
									id: nsa.id,
									data: {
										abbreviation: e.currentTarget.value
									}
								})}
						/>
					</td>
					<td>
						<RoleInput
							class="min-w-48"
							label={m.description()}
							required
							value={nsa.description}
							onchange={(e) =>
								update({
									input: e.currentTarget,
									saved: nsa.description,
									id: nsa.id,
									data: {
										description: e.currentTarget.value
									}
								})}
						/>
					</td>
					<td>
						<div class="flex items-center gap-1">
							<RoleSeatInput
								class={outsideLimits ? 'input-error' : ''}
								value={nsa.seatAmount}
								onchange={(e) =>
									update({
										input: e.currentTarget,
										saved: nsa.seatAmount,
										id: nsa.id,
										data: {
											seatAmount: Number(e.currentTarget.value)
										}
									})}
							/>
							{#if members !== undefined && members > nsa.seatAmount}
								<span
									class="tooltip tooltip-left"
									data-tip={m.seatPlanningOverfilled({ members, seats: nsa.seatAmount })}
								>
									<i class="fa-sharp-duotone fa-solid fa-triangle-exclamation text-error"></i>
								</span>
							{/if}
						</div>
					</td>
					<td>
						<span
							class={members !== undefined ? 'tooltip tooltip-left' : ''}
							data-tip={members !== undefined ? m.nonStateActorDeleteBlocked() : undefined}
						>
							<button
								class="btn btn-ghost btn-sm btn-square text-error"
								aria-label={m.delete()}
								disabled={members !== undefined}
								onclick={() => (toDelete = nsa)}
							>
								<i class="fa-sharp-duotone fa-solid fa-trash"></i>
							</button>
						</span>
					</td>
				</tr>
			{/each}
		</tbody>
		<tfoot>
			<tr>
				<td>
					<RoleIconInput placeholder="fa-tree" bind:value={draft.fontAwesomeIcon} />
				</td>
				<td>
					<RoleInput draft label={m.name()} bind:value={draft.name} />
				</td>
				<td>
					<RoleInput draft label={m.abbreviation()} bind:value={draft.abbreviation} />
				</td>
				<td>
					<RoleInput draft label={m.description()} bind:value={draft.description} />
				</td>
				<td>
					<RoleSeatInput bind:value={draft.seatAmount} />
				</td>
				<td>
					<RoleAddButton disabled={!draftValid} onclick={create} />
				</td>
			</tr>
		</tfoot>
	</table>
</div>

<RoleDeleteModal
	bind:role={toDelete}
	confirmation={(role) => m.seatPlanningDeleteNonStateActorConfirm({ name: role.name })}
	onconfirm={remove}
/>
