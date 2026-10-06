<script lang="ts">
	import Modal from '$lib/components/Modal.svelte';
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import { toast } from 'svelte-sonner';
	import FormFieldset from '$lib/components/form/FormFieldset.svelte';
	import { configPublic } from '$config/public';
	import { translateTeamRole } from '$lib/utils/enumTranslations';

	interface Props {
		open: boolean;
		conferenceId: string;
	}

	let { open = $bindable(false), conferenceId }: Props = $props();

	type Step = 'enter' | 'review';
	let step = $state<Step>('enter');
	let emailInput = $state('');
	let isChecking = $state(false);
	let isSending = $state(false);

	type EmailStatusValue = 'exists' | 'new_user' | 'pending_invitation' | 'already_member';
	type TeamRoleValue =
		| 'MEMBER'
		| 'REVIEWER'
		| 'PARTICIPANT_CARE'
		| 'TEAM_COORDINATOR'
		| 'CONTENT_LEAD'
		| 'PROJECT_MANAGEMENT';

	const teamRoles: TeamRoleValue[] = [
		'MEMBER',
		'REVIEWER',
		'PARTICIPANT_CARE',
		'TEAM_COORDINATOR',
		'CONTENT_LEAD',
		'PROJECT_MANAGEMENT'
	];

	const validEmailStatuses: EmailStatusValue[] = [
		'exists',
		'new_user',
		'pending_invitation',
		'already_member'
	];

	function isEmailStatusValue(value: string): value is EmailStatusValue {
		return validEmailStatuses.includes(value as EmailStatusValue);
	}

	type EmailStatus = {
		email: string;
		status: EmailStatusValue;
		userId: string | null;
		pendingInvitationId: string | null;
		selected: boolean;
		role: TeamRoleValue;
		isExternal: boolean;
	};

	let emailStatuses = $state<EmailStatus[]>([]);
	let hasExternalEmails = $derived(emailStatuses.some((e) => e.selected && e.isExternal));

	/** Whether an address can still be invited: it is neither a member nor already invited. */
	const isInvitable = (e: EmailStatus) =>
		e.status !== 'already_member' && e.status !== 'pending_invitation';

	let canSend = $derived(!isSending && emailStatuses.some((e) => e.selected && isInvitable(e)));
	let allSelected = $derived(
		emailStatuses.every((e) => e.selected || e.status === 'already_member')
	);

	function selectAll(checked: boolean) {
		emailStatuses = emailStatuses.map((es) => ({
			...es,
			selected: es.status === 'already_member' ? false : checked
		}));
	}

	function setRole(index: number, value: string) {
		const role = teamRoles.find((r) => r === value);
		if (role) emailStatuses[index].role = role;
	}

	const organizationDomain = configPublic.PUBLIC_TEAM_ORGANIZATION_DOMAIN;

	function parseEmails(input: string): string[] {
		const normalized = input
			.split(/[,;\n]+/)
			.map((e) => e.trim().toLowerCase())
			.filter((e) => e.length > 0 && e.includes('@'));
		return [...new Set(normalized)];
	}

	function isExternalEmail(email: string): boolean {
		if (!organizationDomain) return false;
		const domain = email.split('@')[1];
		return domain !== organizationDomain;
	}

	async function handleCheckEmails() {
		const emails = parseEmails(emailInput);
		if (emails.length === 0) {
			toast.error(m.enterAtLeastOneEmail());
			return;
		}

		isChecking = true;
		try {
			const checked = await client.query.checkTeamInvitationEmails({
				__args: { conferenceId, emails: emails.map((email) => ({ email })) },
				email: true,
				status: true,
				userId: true,
				pendingInvitationId: true
			});

			emailStatuses = checked.map((s) => ({
				email: s.email,
				status: isEmailStatusValue(s.status) ? s.status : 'new_user',
				userId: s.userId,
				pendingInvitationId: s.pendingInvitationId,
				selected: s.status !== 'already_member',
				role: 'MEMBER',
				isExternal: isExternalEmail(s.email)
			}));
			step = 'review';
		} catch (error) {
			toast.error(m.httpGenericError());
			console.error('Failed to check emails:', error);
		} finally {
			isChecking = false;
		}
	}

	async function handleSendInvitations() {
		const selectedEmails = emailStatuses.filter((e) => e.selected && isInvitable(e));

		if (selectedEmails.length === 0) {
			toast.error(m.noEmailsSelected());
			return;
		}

		isSending = true;
		try {
			const { created, errors } = await client.mutate.createTeamMemberInvitations({
				__args: {
					conferenceId,
					invitations: selectedEmails.map((e) => ({ email: e.email, role: e.role }))
				},
				created: { addedDirectly: true },
				errors: { email: true, error: true }
			});

			if (created.length > 0) {
				const directlyAdded = created.filter((c) => c.addedDirectly).length;
				const invitationsSent = created.filter((c) => !c.addedDirectly).length;

				let message = '';
				if (directlyAdded > 0) {
					message += m.usersAddedDirectly({ count: directlyAdded });
				}
				if (invitationsSent > 0) {
					if (message) message += ' ';
					message += m.invitationsSentCount({ count: invitationsSent });
				}
				toast.success(message);
			}

			if (errors.length > 0) {
				errors.forEach((err) => {
					toast.error(`${err.email}: ${err.error}`);
				});
			}

			handleClose();
		} catch (error) {
			toast.error(m.httpGenericError());
			console.error('Failed to send invitations:', error);
		} finally {
			isSending = false;
		}
	}

	function handleClose() {
		open = false;
		step = 'enter';
		emailInput = '';
		emailStatuses = [];
	}

	function getStatusBadge(status: EmailStatus['status']): { class: string; text: string } {
		switch (status) {
			case 'exists':
				return { class: 'badge-success', text: m.accountExists() };
			case 'new_user':
				return { class: 'badge-info', text: m.newUser() };
			case 'pending_invitation':
				return { class: 'badge-warning', text: m.pendingInvitation() };
			case 'already_member':
				return { class: 'badge-ghost', text: m.alreadyMember() };
			default:
				return { class: 'badge-ghost', text: status };
		}
	}
</script>

{#snippet emailRow(emailStatus: EmailStatus, i: number)}
	<tr class={emailStatus.status === 'already_member' ? 'opacity-50' : ''}>
		<td>
			<input
				type="checkbox"
				class="checkbox"
				disabled={!isInvitable(emailStatus)}
				checked={emailStatus.selected}
				onchange={(e) => {
					emailStatuses[i].selected = e.currentTarget.checked;
				}}
			/>
		</td>
		<td>
			<div class="flex items-center gap-2">
				{emailStatus.email}
				{#if emailStatus.isExternal}
					<span class="badge badge-warning badge-sm">{m.externalDomain()}</span>
				{/if}
			</div>
		</td>
		<td>
			<span class="badge {getStatusBadge(emailStatus.status).class}"
				>{getStatusBadge(emailStatus.status).text}</span
			>
		</td>
		<td>
			{#if isInvitable(emailStatus)}
				<select
					class="select select-bordered select-sm"
					value={emailStatus.role}
					onchange={(e) => setRole(i, e.currentTarget.value)}
				>
					{#each teamRoles as role (role)}
						<option value={role}>{translateTeamRole(role)}</option>
					{/each}
				</select>
			{:else}
				<span class="text-base-content/50">—</span>
			{/if}
		</td>
	</tr>
{/snippet}

{#snippet enterStep()}
	<div class="flex flex-col gap-4">
		<FormFieldset title={m.emailAddresses()}>
			<textarea
				class="textarea textarea-bordered w-full h-32"
				bind:value={emailInput}
				placeholder={m.enterEmailsPlaceholder()}></textarea>
			<p class="text-sm text-base-content/70">{m.separateEmailsHint()}</p>
		</FormFieldset>

		<div class="modal-action">
			<button class="btn" onclick={handleClose}>{m.cancel()}</button>
			<button
				class="btn btn-primary"
				onclick={handleCheckEmails}
				disabled={!emailInput.trim() || isChecking}
			>
				{#if isChecking}
					<i class="fa-solid fa-spinner fa-spin"></i>
				{/if}
				{m.checkEmails()}
			</button>
		</div>
	</div>
{/snippet}

{#snippet reviewStep()}
	<div class="flex flex-col gap-4">
		{#if hasExternalEmails}
			<div class="alert alert-warning">
				<i class="fa-duotone fa-triangle-exclamation"></i>
				<span>{m.externalEmailWarning({ domain: organizationDomain ?? '' })}</span>
			</div>
		{/if}

		<div class="overflow-x-auto">
			<table class="table table-zebra">
				<thead>
					<tr>
						<th>
							<input
								type="checkbox"
								class="checkbox"
								checked={allSelected}
								onchange={(e) => selectAll(e.currentTarget.checked)}
							/>
						</th>
						<th>{m.email()}</th>
						<th>{m.status()}</th>
						<th>{m.role()}</th>
					</tr>
				</thead>
				<tbody>
					{#each emailStatuses as emailStatus, i (emailStatus.email)}
						{@render emailRow(emailStatus, i)}
					{/each}
				</tbody>
			</table>
		</div>

		<div class="modal-action">
			<button class="btn" onclick={() => (step = 'enter')}>{m.back()}</button>
			<button class="btn btn-primary" onclick={handleSendInvitations} disabled={!canSend}>
				{#if isSending}
					<i class="fa-solid fa-spinner fa-spin"></i>
				{/if}
				{m.sendInvitations()}
			</button>
		</div>
	</div>
{/snippet}

<Modal bind:open title={m.inviteTeamMembers()} onclose={handleClose} fullWidth={step === 'review'}>
	{#if step === 'enter'}
		{@render enterStep()}
	{:else if step === 'review'}
		{@render reviewStep()}
	{/if}
</Modal>
