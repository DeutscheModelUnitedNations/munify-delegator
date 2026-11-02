<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { optionalText, type ChaseAccess, type CustomRole } from './customRoles';
	import { fetchActiveChaseLink } from '#lib/api/chaseLink';
	import { toast } from 'svelte-sonner';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
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

	// what a role's people are in CHASE matters only while this instance is linked to one
	const chaseLink = $derived(await fetchActiveChaseLink());
	const columns = $derived(chaseLink ? 7 : 6);

	const chaseAccessOptions: { value: ChaseAccess; label: () => string }[] = [
		{ value: 'SPECTATOR', label: () => m.chaseAccessSpectator() },
		{ value: 'TEAM', label: () => m.chaseAccessTeam() },
		{ value: 'NONE', label: () => m.chaseAccessNone() }
	];

	function setChaseAccess({ id, chaseAccess }: { id: string; chaseAccess: ChaseAccess }) {
		const promise = Promise.resolve(
			client.mutate.updateCustomRole({ __args: { id, chaseAccess }, chaseAccess: true })
		);
		toast.promise(promise, genericPromiseToastMessages);
	}

	let draft = $state(emptyDraft());
	let toDelete = $state<CustomRole>();

	const draftValid = $derived(!!draft.name.trim() && draft.seatAmount >= 1);

	const totalSeats = $derived(customRoles.reduce((sum, role) => sum + role.seatAmount, 0));
	const totalHolders = $derived(customRoles.reduce((sum, role) => sum + role.holders, 0));

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
		data: { name?: string; description?: string; fontAwesomeIcon?: string; seatAmount?: number };
	}) =>
		saveField({
			input,
			saved,
			save: () => client.mutate.updateCustomRole({ __args: { id, ...data }, seatAmount: true })
		});

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
					{#if chaseLink}
						<th class="w-40" title={m.chaseAccessHint()}>{m.chaseAccess()}</th>
					{/if}
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
									update({
										input: e.currentTarget,
										saved: role.fontAwesomeIcon ?? '',
										id: role.id,
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
								value={role.name}
								onchange={(e) =>
									update({
										input: e.currentTarget,
										saved: role.name,
										id: role.id,
										data: { name: e.currentTarget.value }
									})}
							/>
						</td>
						<td>
							<RoleInput
								class="min-w-48"
								label={m.description()}
								value={role.description}
								onchange={(e) =>
									update({
										input: e.currentTarget,
										saved: role.description,
										id: role.id,
										data: {
											description: e.currentTarget.value
										}
									})}
							/>
						</td>
						<td>
							<RoleSeatInput
								min={Math.max(role.holders, 1)}
								value={role.seatAmount}
								onchange={(e) =>
									update({
										input: e.currentTarget,
										saved: role.seatAmount,
										id: role.id,
										data: {
											seatAmount: Number(e.currentTarget.value)
										}
									})}
							/>
						</td>
						<td>
							<span class={role.holders >= role.seatAmount ? 'text-success' : ''}>
								{role.holders} / {role.seatAmount}
							</span>
						</td>
						{#if chaseLink}
							<td>
								<select
									class="select select-sm"
									aria-label={m.chaseAccess()}
									value={role.chaseAccess}
									onchange={(e) => {
										const chaseAccess = chaseAccessOptions.find(
											(option) => option.value === e.currentTarget.value
										)?.value;
										if (chaseAccess) setChaseAccess({ id: role.id, chaseAccess });
									}}
								>
									{#each chaseAccessOptions as option (option.value)}
										<option value={option.value}>{option.label()}</option>
									{/each}
								</select>
							</td>
						{/if}
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
						<td colspan={columns} class="text-base-content/60 text-center">
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
					{#if chaseLink}
						<td></td>
					{/if}
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
