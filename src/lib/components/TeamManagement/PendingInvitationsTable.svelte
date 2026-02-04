<script lang="ts">
	import { cache, graphql } from '$houdini';
	import { m } from '$lib/paraglide/messages';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';
	import { translateTeamRole } from '$lib/services/enumTranslations';
	import { page } from '$app/stores';

	interface Invitation {
		id: string;
		email: string;
		role: string;
		expiresAt: string;
		userExists: boolean;
		invitedBy: {
			given_name: string;
			family_name: string;
		};
	}

	interface Props {
		invitations: Invitation[];
	}

	let { invitations }: Props = $props();

	const revokeInvitationMutation = graphql(`
		mutation RevokeTeamMemberInvitationShared($invitationId: String!) {
			revokeTeamMemberInvitation(invitationId: $invitationId) {
				success
				message
			}
		}
	`);

	const regenerateInvitationMutation = graphql(`
		mutation RegenerateTeamMemberInvitationShared($invitationId: String!, $sendEmail: Boolean!) {
			regenerateTeamMemberInvitation(invitationId: $invitationId, sendEmail: $sendEmail) {
				success
				newToken
				newExpiresAt
				message
			}
		}
	`);

	async function handleRevoke(invitationId: string) {
		if (!confirm(m.confirmRevokeInvitation())) return;

		try {
			const result = await revokeInvitationMutation.mutate({ invitationId });
			if (result.data?.revokeTeamMemberInvitation.success) {
				toast.success(m.invitationRevoked());
				cache.markStale();
				await invalidateAll();
			} else {
				toast.error(result.data?.revokeTeamMemberInvitation.message ?? m.httpGenericError());
			}
		} catch (error) {
			toast.error(m.httpGenericError());
			console.error('Failed to revoke invitation:', error);
		}
	}

	async function handleRegenerateAndCopy(invitationId: string) {
		try {
			const result = await regenerateInvitationMutation.mutate({
				invitationId,
				sendEmail: false
			});

			if (result.data?.regenerateTeamMemberInvitation.success) {
				const token = result.data.regenerateTeamMemberInvitation.newToken;
				if (token) {
					const inviteUrl = `${$page.url.origin}/auth/accept-invitation?token=${token}`;
					await navigator.clipboard.writeText(inviteUrl);
					toast.success(m.linkCopied());
				}
				cache.markStale();
				await invalidateAll();
			} else {
				toast.error(result.data?.regenerateTeamMemberInvitation.message ?? m.httpGenericError());
			}
		} catch (error) {
			toast.error(m.httpGenericError());
			console.error('Failed to regenerate invitation:', error);
		}
	}

	async function handleResendEmail(invitationId: string) {
		try {
			const result = await regenerateInvitationMutation.mutate({
				invitationId,
				sendEmail: true
			});

			if (result.data?.regenerateTeamMemberInvitation.success) {
				toast.success(m.invitationResent());
				cache.markStale();
				await invalidateAll();
			} else {
				toast.error(result.data?.regenerateTeamMemberInvitation.message ?? m.httpGenericError());
			}
		} catch (error) {
			toast.error(m.httpGenericError());
			console.error('Failed to resend invitation:', error);
		}
	}

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function isExpired(dateStr: string): boolean {
		return new Date(dateStr) < new Date();
	}
</script>

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
					{#each invitations as invitation}
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
							<td>
								<span class={expired ? 'text-error' : ''}>
									{formatDate(invitation.expiresAt)}
									{#if expired}
										<span class="text-xs">({m.expired()})</span>
									{/if}
								</span>
							</td>
							<td>
								{invitation.invitedBy.given_name}
								{invitation.invitedBy.family_name}
							</td>
							<td>
								<div class="flex gap-2 justify-end">
									<button
										class="btn btn-sm btn-ghost"
										onclick={() => handleRegenerateAndCopy(invitation.id)}
										title={m.copyLink()}
									>
										<i class="fa-duotone fa-copy"></i>
									</button>
									<button
										class="btn btn-sm btn-ghost"
										onclick={() => handleResendEmail(invitation.id)}
										title={m.resendInvitation()}
									>
										<i class="fa-duotone fa-paper-plane"></i>
									</button>
									<button
										class="btn btn-sm btn-ghost text-error"
										onclick={() => handleRevoke(invitation.id)}
										title={m.revokeInvitation()}
									>
										<i class="fa-duotone fa-ban"></i>
									</button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
{/if}
