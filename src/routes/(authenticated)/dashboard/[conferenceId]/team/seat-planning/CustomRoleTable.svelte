<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { optionalText, type CustomRole } from './customRoles';
	import RoleAddButton from './RoleAddButton.svelte';
	import RoleDeleteModal from './RoleDeleteModal.svelte';
	import RoleIconInput from './RoleIconInput.svelte';
	import RoleInput from './RoleInput.svelte';
	import RoleSeatInput from './RoleSeatInput.svelte';
	import { saveField, showError } from './roleEditing';

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

	/** saves one field; a refused change puts the saved value back into the input */
	const update = (
		input: HTMLInputElement,
		saved: string | number,
		id: string,
		data: { name?: string; description?: string; fontAwesomeIcon?: string; seatAmount?: number }
	) =>
		saveField(input, saved, () =>
			client.mutate.updateCustomRole({ __args: { id, ...data }, seatAmount: true })
		);

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
							<RoleIconInput
								class="min-w-24"
								value={role.fontAwesomeIcon ?? ''}
								onchange={(e) =>
									update(e.currentTarget, role.fontAwesomeIcon ?? '', role.id, {
										fontAwesomeIcon: e.currentTarget.value
									})}
							/>
						</td>
						<td>
							<RoleInput
								class="min-w-36"
								label={m.name()}
								required
								value={role.name}
								onchange={(e) =>
									update(e.currentTarget, role.name, role.id, { name: e.currentTarget.value })}
							/>
						</td>
						<td>
							<RoleInput
								class="min-w-48"
								label={m.description()}
								value={role.description}
								onchange={(e) =>
									update(e.currentTarget, role.description, role.id, {
										description: e.currentTarget.value
									})}
							/>
						</td>
						<td>
							<RoleSeatInput
								min={Math.max(role.holders, 1)}
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
						<RoleIconInput
							placeholder="fa-newspaper"
							class="min-w-24"
							bind:value={draft.fontAwesomeIcon}
						/>
					</td>
					<td>
						<RoleInput class="min-w-36" draft label={m.name()} bind:value={draft.name} />
					</td>
					<td>
						<RoleInput
							class="min-w-48"
							draft
							label={m.description()}
							bind:value={draft.description}
						/>
					</td>
					<td>
						<RoleSeatInput bind:value={draft.seatAmount} />
					</td>
					<td>
						<span class="text-base-content/70 text-xs">
							{m.seatPlanningCustomRolesTotal({ holders: totalHolders, seats: totalSeats })}
						</span>
					</td>
					<td>
						<RoleAddButton disabled={!draftValid} onclick={create} />
					</td>
				</tr>
			</tfoot>
		</table>
	</div>
</div>

<RoleDeleteModal
	bind:role={toDelete}
	confirmation={(role) => m.seatPlanningDeleteCustomRoleConfirm({ name: role.name })}
	onconfirm={remove}
/>
