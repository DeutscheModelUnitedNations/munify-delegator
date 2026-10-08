<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import Flag from '$lib/components/Flag.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { m } from '$lib/paraglide/messages';
	import { isOutsideSizeLimits, type SizeLimits } from '$lib/helpers/seatPlanning/hints';
	import { toast } from 'svelte-sonner';
	import type { SeatPlanner } from './seatPlanner.svelte';

	interface NonStateActor {
		id: string;
		name: string;
		abbreviation: string;
		description: string;
		fontAwesomeIcon: string | null;
		seatAmount: number;
	}

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

	const showError = (error: unknown) =>
		toast.error(error instanceof Error ? error.message : m.genericToastError());

	/** saves one field; a refused change puts the saved value back into the input */
	async function update(
		input: HTMLInputElement,
		saved: string | number,
		id: string,
		data: Partial<Omit<NonStateActor, 'id'>>
	) {
		try {
			await client.mutate.updateNonStateActor({ __args: { id, ...data }, seatAmount: true });
			toast.success(m.saved());
		} catch (error) {
			showError(error);
			input.value = String(saved);
		}
	}

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
				{@const outsideLimits = isOutsideSizeLimits(nsa.seatAmount, sizeLimits)}
				<tr class={outsideLimits ? 'bg-error/10' : ''}>
					<td>
						<div class="flex items-center gap-2">
							<Flag nsa icon={nsa.fontAwesomeIcon} size="xs" />
							<input
								class="input input-sm w-full"
								aria-label={m.seatPlanningIcon()}
								value={nsa.fontAwesomeIcon ?? ''}
								onchange={(e) =>
									update(e.currentTarget, nsa.fontAwesomeIcon ?? '', nsa.id, {
										fontAwesomeIcon: e.currentTarget.value
									})}
							/>
						</div>
					</td>
					<td>
						<input
							class="input input-sm w-full"
							aria-label={m.name()}
							required
							value={nsa.name}
							onchange={(e) =>
								update(e.currentTarget, nsa.name, nsa.id, { name: e.currentTarget.value })}
						/>
					</td>
					<td>
						<input
							class="input input-sm w-full"
							aria-label={m.abbreviation()}
							required
							value={nsa.abbreviation}
							onchange={(e) =>
								update(e.currentTarget, nsa.abbreviation, nsa.id, {
									abbreviation: e.currentTarget.value
								})}
						/>
					</td>
					<td>
						<input
							class="input input-sm w-full"
							aria-label={m.description()}
							required
							value={nsa.description}
							onchange={(e) =>
								update(e.currentTarget, nsa.description, nsa.id, {
									description: e.currentTarget.value
								})}
						/>
					</td>
					<td>
						<div class="flex items-center gap-1">
							<input
								type="number"
								min="1"
								class="input input-sm w-16 {outsideLimits && 'input-error'}"
								aria-label={m.seats()}
								value={nsa.seatAmount}
								onchange={(e) =>
									update(e.currentTarget, nsa.seatAmount, nsa.id, {
										seatAmount: Number(e.currentTarget.value)
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
					<div class="flex items-center gap-2">
						<Flag nsa icon={draft.fontAwesomeIcon || null} size="xs" />
						<input
							class="input input-sm w-full"
							aria-label={m.seatPlanningIcon()}
							placeholder="fa-tree"
							bind:value={draft.fontAwesomeIcon}
						/>
					</div>
				</td>
				<td>
					<input
						class="input input-sm w-full"
						aria-label={m.name()}
						placeholder={m.name()}
						bind:value={draft.name}
					/>
				</td>
				<td>
					<input
						class="input input-sm w-full"
						aria-label={m.abbreviation()}
						placeholder={m.abbreviation()}
						bind:value={draft.abbreviation}
					/>
				</td>
				<td>
					<input
						class="input input-sm w-full"
						aria-label={m.description()}
						placeholder={m.description()}
						bind:value={draft.description}
					/>
				</td>
				<td>
					<input
						type="number"
						min="1"
						class="input input-sm w-16"
						aria-label={m.seats()}
						bind:value={draft.seatAmount}
					/>
				</td>
				<td>
					<button
						class="btn btn-primary btn-sm btn-square"
						aria-label={m.add()}
						disabled={!draftValid}
						onclick={create}
					>
						<i class="fa-sharp-duotone fa-solid fa-plus"></i>
					</button>
				</td>
			</tr>
		</tfoot>
	</table>
</div>

<Modal open={!!toDelete} title={m.delete()} onclose={() => (toDelete = undefined)}>
	{#if toDelete}
		<p>{m.seatPlanningDeleteNonStateActorConfirm({ name: toDelete.name })}</p>
	{/if}
	{#snippet action()}
		<button class="btn" onclick={() => (toDelete = undefined)}>{m.cancel()}</button>
		<button class="btn btn-error" onclick={() => toDelete && remove(toDelete.id)}>
			<i class="fa-sharp-duotone fa-solid fa-trash"></i>
			{m.delete()}
		</button>
	{/snippet}
</Modal>
