<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client.js';
	import Flag from '#lib/components/Flag.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { toast } from 'svelte-sonner';
	import { optionalText, type CustomRole } from './customRoles';

	interface Props {
		conferenceId: string;
		customRoles: CustomRole[];
	}

	let { conferenceId, customRoles }: Props = $props();

	const emptyDraft = () => ({ name: '', description: '', fontAwesomeIcon: '', seatAmount: 1 });

	let draft = $state(emptyDraft());
	let toDelete = $state<CustomRole>();

	const draftValid = $derived(!!draft.name.trim() && draft.seatAmount >= 1);

	const totalSeats = $derived(customRoles.reduce((sum, role) => sum + role.seatAmount, 0));
	const totalHolders = $derived(customRoles.reduce((sum, role) => sum + role.holders, 0));

	const showError = (error: unknown) =>
		toast.error(error instanceof Error ? error.message : m.genericToastError());

	/** saves one field; a refused change puts the saved value back into the input */
	async function update(
		input: HTMLInputElement,
		saved: string | number,
		id: string,
		data: { name?: string; description?: string; fontAwesomeIcon?: string; seatAmount?: number }
	) {
		try {
			await client.mutate.updateCustomRole({ __args: { id, ...data }, seatAmount: true });
			toast.success(m.saved());
		} catch (error) {
			showError(error);
			input.value = String(saved);
		}
	}

	async function create() {
		if (!draftValid) return;
		try {
			await client.mutate.createCustomRole({
				__args: {
					conferenceId,
					name: draft.name.trim(),
					description: optionalText(draft.description),
					fontAwesomeIcon: optionalText(draft.fontAwesomeIcon),
					seatAmount: draft.seatAmount
				},
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
			await client.mutate.deleteCustomRole({ __args: { id } });
		} catch (error) {
			showError(error);
		}
	}
</script>

<div class="flex flex-col gap-2">
	<p class="text-base-content/70 text-sm">{m.seatPlanningCustomRolesDescription()}</p>
	<div class="border-base-300 overflow-x-auto rounded-box border">
		<table class="table-sm table">
			<thead>
				<tr>
					<th class="w-32">{m.seatPlanningIcon()}</th>
					<th>{m.name()}</th>
					<th>{m.description()}</th>
					<th class="w-28">{m.seats()}</th>
					<th class="w-28">{m.seatPlanningCustomRoleHolders()}</th>
					<th class="w-12"></th>
				</tr>
			</thead>
			<tbody>
				{#each customRoles as role (role.id)}
					<tr>
						<td>
							<div class="flex items-center gap-2">
								<Flag nsa icon={role.fontAwesomeIcon} size="xs" />
								<input
									class="input input-sm w-full min-w-24"
									aria-label={m.seatPlanningIcon()}
									value={role.fontAwesomeIcon ?? ''}
									onchange={(e) =>
										update(e.currentTarget, role.fontAwesomeIcon ?? '', role.id, {
											fontAwesomeIcon: e.currentTarget.value
										})}
								/>
							</div>
						</td>
						<td>
							<input
								class="input input-sm w-full min-w-36"
								aria-label={m.name()}
								required
								value={role.name}
								onchange={(e) =>
									update(e.currentTarget, role.name, role.id, { name: e.currentTarget.value })}
							/>
						</td>
						<td>
							<input
								class="input input-sm w-full min-w-48"
								aria-label={m.description()}
								value={role.description}
								onchange={(e) =>
									update(e.currentTarget, role.description, role.id, {
										description: e.currentTarget.value
									})}
							/>
						</td>
						<td>
							<input
								type="number"
								min={Math.max(role.holders, 1)}
								class="input input-sm w-16"
								aria-label={m.seats()}
								value={role.seatAmount}
								onchange={(e) =>
									update(e.currentTarget, role.seatAmount, role.id, {
										seatAmount: Number(e.currentTarget.value)
									})}
							/>
						</td>
						<td>
							<span class={role.holders >= role.seatAmount ? 'text-success' : ''}>
								{role.holders} / {role.seatAmount}
							</span>
						</td>
						<td>
							<span
								class={role.holders > 0 ? 'tooltip tooltip-left' : ''}
								data-tip={role.holders > 0 ? m.customRoleStillAssigned() : undefined}
							>
								<button
									class="btn btn-ghost btn-sm btn-square text-error"
									aria-label={m.delete()}
									disabled={role.holders > 0}
									onclick={() => (toDelete = role)}
								>
									<i class="fa-sharp-duotone fa-solid fa-trash"></i>
								</button>
							</span>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="6" class="text-base-content/60 text-center">
							{m.seatPlanningNoCustomRoles()}
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
								class="input input-sm w-full min-w-24"
								aria-label={m.seatPlanningIcon()}
								placeholder="fa-newspaper"
								bind:value={draft.fontAwesomeIcon}
							/>
						</div>
					</td>
					<td>
						<input
							class="input input-sm w-full min-w-36"
							aria-label={m.name()}
							placeholder={m.name()}
							bind:value={draft.name}
						/>
					</td>
					<td>
						<input
							class="input input-sm w-full min-w-48"
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
						<span class="text-base-content/70 text-xs">
							{m.seatPlanningCustomRolesTotal({ holders: totalHolders, seats: totalSeats })}
						</span>
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
</div>

<Modal open={!!toDelete} title={m.delete()} onclose={() => (toDelete = undefined)}>
	{#if toDelete}
		<p>{m.seatPlanningDeleteCustomRoleConfirm({ name: toDelete.name })}</p>
	{/if}
	{#snippet action()}
		<button class="btn" onclick={() => (toDelete = undefined)}>{m.cancel()}</button>
		<button class="btn btn-error" onclick={() => toDelete && remove(toDelete.id)}>
			<i class="fa-sharp-duotone fa-solid fa-trash"></i>
			{m.delete()}
		</button>
	{/snippet}
</Modal>
