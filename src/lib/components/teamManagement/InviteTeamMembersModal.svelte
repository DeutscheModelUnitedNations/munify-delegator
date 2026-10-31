<script lang="ts">
	import { logger } from '#lib/logger';
	import Modal from '#lib/components/Modal.svelte';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { toast } from 'svelte-sonner';
	import { PUBLIC_TEAM_ORGANIZATION_DOMAIN } from '$app/env/public';
	import { translateTeamRole } from '#lib/utils/enumTranslations';
	import type { TeamInvitationEmailStatus } from '#lib/api/rumbleClient/client';

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

	type EmailStatusValue = TeamInvitationEmailStatus;
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

	type EmailStatus = {
		email: string;
		status: EmailStatusValue;
		selected: boolean;
		role: TeamRoleValue;
		isExternal: boolean;
	};

	let emailStatuses = $state<EmailStatus[]>([]);
	let hasExternalEmails = $derived(emailStatuses.some((e) => e.selected && e.isExternal));

	/** Whether an address can still be invited: it is neither a member nor already invited. */
	const isInvitable = (e: EmailStatus) =>
		e.status !== 'ALREADY_MEMBER' && e.status !== 'PENDING_INVITATION';

	let canSend = $derived(!isSending && emailStatuses.some((e) => e.selected && isInvitable(e)));
	let allSelected = $derived(
		emailStatuses.every((e) => e.selected || e.status === 'ALREADY_MEMBER')
	);

	function selectAll(checked: boolean) {
		emailStatuses = emailStatuses.map((es) => ({
			...es,
			selected: es.status === 'ALREADY_MEMBER' ? false : checked
		}));
	}

	function setRole({ index, value }: { index: number; value: string }) {
		const role = teamRoles.find((r) => r === value);
		if (role) emailStatuses[index].role = role;
	}

	const organizationDomain = PUBLIC_TEAM_ORGANIZATION_DOMAIN;

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
				__args: { conferenceId, emails },
				email: true,
				status: true
			});

			emailStatuses = checked.map((s) => ({
				email: s.email,
				status: s.status,
				selected: s.status !== 'ALREADY_MEMBER',
				role: 'MEMBER',
				isExternal: isExternalEmail(s.email)
			}));
			step = 'review';
		} catch (error) {
			toast.error(m.httpGenericError());
			logger.error('Failed to check emails', error);
		} finally {
			isChecking = false;
		}
	}

	function invitationMessage(created: { addedDirectly: boolean }[]) {
		const directlyAdded = created.filter((c) => c.addedDirectly).length;
		return [
			directlyAdded > 0 ? m.usersAddedDirectly({ count: directlyAdded }) : '',
			created.length > directlyAdded
				? m.invitationsSentCount({ count: created.length - directlyAdded })
				: ''
		]
			.filter(Boolean)
			.join(' ');
	}

	function announceInvitations({
		created,
		errors
	}: {
		created: { addedDirectly: boolean }[];
		errors: { email: string; error: string }[];
	}) {
		if (created.length > 0) toast.success(invitationMessage(created));
		for (const err of errors) toast.error(`${err.email}: ${err.error}`);
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

			announceInvitations({ created, errors });
			handleClose();
		} catch (error) {
			toast.error(m.httpGenericError());
			logger.error('Failed to send invitations', error);
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

	const statusBadges: Record<EmailStatusValue, { class: string; text: () => string }> = {
		EXISTS: { class: 'badge-success', text: () => m.accountExists() },
		NEW_USER: { class: 'badge-info', text: () => m.newUser() },
		PENDING_INVITATION: { class: 'badge-warning', text: () => m.pendingInvitation() },
		ALREADY_MEMBER: { class: 'badge-ghost', text: () => m.alreadyMember() }
	};

	function getStatusBadge(status: EmailStatus['status']): { class: string; text: string } {
		const badge = statusBadges[status];
		return { class: badge.class, text: badge.text() };
	}
</script>

{#snippet emailRow(emailStatus: EmailStatus, i: number)}
	<tr class={emailStatus.status === 'ALREADY_MEMBER' ? 'opacity-50' : ''}>
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
			<div class="flex flex-wrap items-center gap-2 break-all">
				{emailStatus.email}
				{#if emailStatus.isExternal}
					<span class="badge badge-warning badge-sm">{m.externalDomain()}</span>
				{/if}
			</div>
		</td>
		<td class="whitespace-nowrap">
			<span class="badge {getStatusBadge(emailStatus.status).class}"
				>{getStatusBadge(emailStatus.status).text}</span
			>
		</td>
		<td>
			{#if isInvitable(emailStatus)}
				<select
					class="select select-bordered select-sm"
					value={emailStatus.role}
					onchange={(e) => setRole({ index: i, value: e.currentTarget.value })}
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
		<label class="flex flex-col gap-2">
			<span class="font-semibold">{m.emailAddresses()}</span>
			<textarea
				class="textarea textarea-bordered w-full h-32"
				bind:value={emailInput}
				placeholder={m.enterEmailsPlaceholder()}></textarea>
			<span class="text-sm text-base-content/70">{m.separateEmailsHint()}</span>
		</label>

		<div class="modal-action">
			<button class="btn" onclick={handleClose}>{m.cancel()}</button>
			<button
				class="btn btn-primary"
				onclick={handleCheckEmails}
				disabled={!emailInput.trim() || isChecking}
			>
				{#if isChecking}
					<i class="fa-sharp-duotone fa-solid fa-spinner fa-spin"></i>
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
				<i class="fa-sharp-duotone fa-solid fa-triangle-exclamation"></i>
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
					<i class="fa-sharp-duotone fa-solid fa-spinner fa-spin"></i>
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
