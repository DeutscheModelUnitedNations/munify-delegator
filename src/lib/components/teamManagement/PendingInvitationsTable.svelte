<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import { toast } from 'svelte-sonner';
	import { translateTeamRole } from '$lib/utils/enumTranslations';
	import { page } from '$app/stores';
	import { runInvitationAction } from './invitationActions';

	interface Invitation {
		id: string;
		email: string;
		role: string;
		expiresAt: Date;
		userExists: boolean;
		invitedBy: {
			givenName: string | null;
			familyName: string | null;
		} | null;
	}

	interface Props {
		invitations: Invitation[];
	}

	let { invitations }: Props = $props();

	async function handleRevoke(invitationId: string) {
		if (!confirm(m.confirmRevokeInvitation())) return;

		await runInvitationAction(
			() =>
				client.mutate.revokeTeamMemberInvitation({
					__args: { invitationId },
					success: true,
					message: true
				}),
			() => {
				toast.success(m.invitationRevoked());
			},
			'Failed to revoke invitation:'
		);
	}

	async function handleRegenerateAndCopy(invitationId: string) {
		await runInvitationAction(
			() =>
				client.mutate.regenerateTeamMemberInvitation({
					__args: { invitationId, sendEmail: false },
					success: true,
					newToken: true,
					newExpiresAt: true,
					message: true
				}),
			async (result) => {
				if (!result.newToken) return;
				const inviteUrl = `${$page.url.origin}/auth/accept-invitation?token=${result.newToken}`;
				await navigator.clipboard.writeText(inviteUrl);
				toast.success(m.linkCopied());
			},
			'Failed to regenerate invitation:'
		);
	}

	async function handleResendEmail(invitationId: string) {
		await runInvitationAction(
			() =>
				client.mutate.regenerateTeamMemberInvitation({
					__args: { invitationId, sendEmail: true },
					success: true,
					message: true
				}),
			() => {
				toast.success(m.invitationResent());
			},
			'Failed to resend invitation:'
		);
	}

	function formatDate(date: Date | string): string {
		return new Date(date).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function isExpired(date: Date | string): boolean {
		return new Date(date) < new Date();
	}
</script>

{#snippet expiry(expiresAt: Date | string, expired: boolean)}
	<span class={expired ? 'text-error' : ''}>
		{formatDate(expiresAt)}
		{#if expired}
			<span class="text-xs">({m.expired()})</span>
		{/if}
	</span>
{/snippet}

{#snippet actions(invitationId: string)}
	<div class="flex gap-2 justify-end">
		<button
			class="btn btn-sm btn-ghost"
			onclick={() => handleRegenerateAndCopy(invitationId)}
			title={m.copyLink()}
		>
			<i class="fa-sharp-duotone fa-solid fa-copy"></i>
		</button>
		<button
			class="btn btn-sm btn-ghost"
			onclick={() => handleResendEmail(invitationId)}
			title={m.resendInvitation()}
		>
			<i class="fa-sharp-duotone fa-solid fa-paper-plane"></i>
		</button>
		<button
			class="btn btn-sm btn-ghost text-error"
			onclick={() => handleRevoke(invitationId)}
			title={m.revokeInvitation()}
		>
			<i class="fa-sharp-duotone fa-solid fa-ban"></i>
		</button>
	</div>
{/snippet}

{#if invitations.length > 0}
	<div class="flex flex-col gap-4 mt-8">
		<h2 class="text-xl font-semibold">{m.pendingInvitations()}</h2>

		<div class="overflow-x-auto">
			<table class="table table-zebra">
				<thead>
					<tr>
						<th>{m.email()}</th>
						<th>{m.role()}</th>
						<th>{m.status()}</th>
						<th>{m.expiresAt()}</th>
						<th>{m.invitedBy()}</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each invitations as invitation (invitation.id)}
						{@const expired = isExpired(invitation.expiresAt)}
						<tr class={expired ? 'opacity-50' : ''}>
							<td>{invitation.email}</td>
							<td>
								<span class="badge badge-ghost">{translateTeamRole(invitation.role)}</span>
							</td>
							<td>
								{#if invitation.userExists}
									<span class="badge badge-success">{m.accountExists()}</span>
								{:else}
									<span class="badge badge-info">{m.newUser()}</span>
								{/if}
							</td>
							<td>{@render expiry(invitation.expiresAt, expired)}</td>
							<td>
								{invitation.invitedBy?.givenName}
								{invitation.invitedBy?.familyName}
							</td>
							<td>{@render actions(invitation.id)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
{/if}
