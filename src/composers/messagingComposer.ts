import { db } from '$db/db';
import { renderDelegationMessageEmail } from '$api/services/email/delegationMessageTemplates';
import { emailService } from '$api/services/email/emailService';
import countries from 'world-countries';

// Helper function to generate delegate label
export function getInitials(firstName: string, lastName: string) {
	return `${firstName.charAt(0)}.${lastName.charAt(0)}.`;
}

export function getDelegateLabel(
	user: { given_name: string; family_name: string },
	delegationMember: {
		delegation: {
			assignedNation: { alpha3Code: string } | null;
			assignedNonStateActor: { name: string } | null;
		};
		assignedCommittee: { abbreviation: string | null; name: string } | null;
	} | null,
	singleParticipant: {
		assignedRole: { name: string } | null;
	} | null
): string {
	let label = 'Participant';

	if (delegationMember) {
		if (delegationMember.delegation.assignedNation) {
			const alpha3Code = delegationMember.delegation.assignedNation.alpha3Code;
			const nation = countries.find((c) => c.cca3 === alpha3Code);
			const nationName = nation ? nation.name.common : alpha3Code;

			label = nationName;
			if (delegationMember.assignedCommittee) {
				label += ` (${delegationMember.assignedCommittee.abbreviation || delegationMember.assignedCommittee.name})`;
			}
		} else if (delegationMember.delegation.assignedNonStateActor) {
			label = delegationMember.delegation.assignedNonStateActor.name;
			const initials = getInitials(user.given_name, user.family_name);
			label += ` (${initials})`;
		}
	} else if (singleParticipant) {
		if (singleParticipant.assignedRole) {
			const initials = getInitials(user.given_name, user.family_name);
			label = `${singleParticipant.assignedRole.name} (${initials})`;
		}
	}
	return label;
}

export async function getMessageRecipients(conferenceId: string, userId: string) {
	console.log('[getMessageRecipients] User:', userId, 'Conference:', conferenceId);

	// Get current user's delegation member to find their delegationId
	const currentDelegationMember = await db.delegationMember.findUnique({
		where: {
			conferenceId_userId: {
				conferenceId: conferenceId,
				userId: userId
			}
		},
		select: {
			delegationId: true
		}
	});

	if (!currentDelegationMember?.delegationId) {
		console.log('[getMessageRecipients] User is not part of a delegation');
		return [];
	}

	console.log('[getMessageRecipients] User delegation ID:', currentDelegationMember.delegationId);

	// Fetch delegation members in the SAME delegation (excluding current user)
	const delegationMembers = await db.delegationMember.findMany({
		where: {
			delegationId: currentDelegationMember.delegationId,
			userId: { not: userId }
		},
		include: {
			user: {
				select: {
					id: true,
					given_name: true,
					family_name: true
				}
			},
			delegation: {
				include: {
					assignedNation: true,
					assignedNonStateActor: true
				}
			},
			assignedCommittee: true
		}
	});

	console.log('[getMessageRecipients] Delegation members found:', delegationMembers.length);

	// Build recipient list
	const recipients: Array<{ id: string; label: string }> = [];

	for (const member of delegationMembers) {
		if (!member.user) continue;
		const userObj = member.user;
		const name = `${userObj.given_name} ${userObj.family_name}`;
		const roleLabel = getDelegateLabel(userObj, member, null);
		const label = roleLabel ? `${name} - ${roleLabel}` : name;
		recipients.push({ id: userObj.id, label });
	}

	// Sort by label
	recipients.sort((a, b) => a.label.localeCompare(b.label));

	console.log('[getMessageRecipients] Final recipients count:', recipients.length);

	return recipients;
}

export async function getMessageHistory(conferenceId: string, userId: string) {
	const audits = await db.messageAudit.findMany({
		where: {
			senderUserId: userId,
			conferenceId: conferenceId
		},
		orderBy: { createdAt: 'desc' },
		select: {
			subject: true,
			createdAt: true,
			status: true,
			recipientUserId: true,
			recipientUser: {
				select: {
					id: true,
					given_name: true,
					family_name: true
				}
			}
		}
	});

	if (audits.length === 0) {
		return [];
	}

	const recipientIds = Array.from(new Set(audits.map((audit) => audit.recipientUserId)));

	const delegationMembers = await db.delegationMember.findMany({
		where: {
			conferenceId: conferenceId,
			userId: { in: recipientIds }
		},
		include: {
			delegation: {
				include: {
					assignedNation: true,
					assignedNonStateActor: true
				}
			},
			assignedCommittee: true
		}
	});

	const delegationByUserId = new Map(delegationMembers.map((member) => [member.userId, member]));

	const singleParticipants = await db.singleParticipant.findMany({
		where: {
			conferenceId: conferenceId,
			userId: { in: recipientIds }
		},
		include: {
			assignedRole: true
		}
	});

	const singleByUserId = new Map(
		singleParticipants.map((participant) => [participant.userId, participant])
	);

	const items = audits.map((audit) => {
		const recipient = audit.recipientUser;
		const delegationMember = delegationByUserId.get(audit.recipientUserId) ?? null;
		const singleParticipant = !delegationMember
			? (singleByUserId.get(audit.recipientUserId) ?? null)
			: null;
		const roleLabel = recipient
			? getDelegateLabel(recipient, delegationMember, singleParticipant)
			: 'Participant';
		const recipientLabel =
			roleLabel !== 'Participant' && roleLabel
				? roleLabel
				: recipient
					? `${recipient.given_name} ${recipient.family_name}`
					: 'Participant';
		const status = audit.status.charAt(0) + audit.status.slice(1).toLowerCase();

		return {
			recipientLabel,
			subject: audit.subject,
			sentAt: audit.createdAt.toISOString(),
			status
		};
	});

	return items;
}

export async function sendDelegationMessage({
	conferenceId,
	recipientId,
	subject,
	body,
	replyUrl,
	senderId
}: {
	conferenceId: string;
	recipientId: string;
	subject: string;
	body: string;
	replyUrl: string;
	senderId: string;
}) {
	// Validate inputs
	if (!recipientId.trim() || !subject.trim() || !body.trim()) {
		throw new Error('Missing required fields');
	}

	if (recipientId === senderId) {
		throw new Error('Cannot send message to yourself');
	}

	// Get sender info
	const sender = await db.user.findUnique({
		where: { id: senderId },
		select: {
			canReceiveDelegationMail: true,
			id: true,
			given_name: true,
			family_name: true
		}
	});

	if (!sender) {
		throw new Error('Sender not found');
	}

	if (!sender.canReceiveDelegationMail) {
		throw new Error('You must enable messaging in your account settings.');
	}

	// Get recipient info
	const recipient = await db.user.findUnique({
		where: { id: recipientId },
		select: {
			canReceiveDelegationMail: true,
			email: true,
			id: true
		}
	});

	if (!recipient) {
		throw new Error('Recipient not found');
	}

	if (!recipient.canReceiveDelegationMail) {
		throw new Error('Recipient has not enabled messaging.');
	}

	// Get conference info
	const conference = await db.conference.findUnique({
		where: { id: conferenceId },
		select: { title: true }
	});

	if (!conference) {
		throw new Error('Conference not found');
	}

	// Verify sender is part of conference
	const senderDelegationMember = await db.delegationMember.findUnique({
		where: {
			conferenceId_userId: {
				conferenceId: conferenceId,
				userId: sender.id
			}
		},
		include: {
			delegation: {
				include: {
					assignedNation: true,
					assignedNonStateActor: true
				}
			},
			assignedCommittee: true
		}
	});

	let senderSingleParticipant = null as {
		assignedRole: { name: string } | null;
	} | null;
	if (!senderDelegationMember) {
		senderSingleParticipant = await db.singleParticipant.findUnique({
			where: {
				conferenceId_userId: {
					conferenceId: conferenceId,
					userId: sender.id
				}
			},
			include: {
				assignedRole: true
			}
		});
	}

	if (!senderDelegationMember && !senderSingleParticipant) {
		throw new Error('Sender is not part of this conference');
	}

	const senderLabel = getDelegateLabel(sender, senderDelegationMember, senderSingleParticipant);

	// Verify recipient is part of conference
	const recipientDelegationMember = await db.delegationMember.findUnique({
		where: {
			conferenceId_userId: {
				conferenceId: conferenceId,
				userId: recipient.id
			}
		}
	});

	let recipientSingleParticipant = null as {
		assignedRole: { name: string } | null;
	} | null;
	if (!recipientDelegationMember) {
		recipientSingleParticipant = await db.singleParticipant.findUnique({
			where: {
				conferenceId_userId: {
					conferenceId: conferenceId,
					userId: recipient.id
				}
			},
			include: {
				assignedRole: true
			}
		});
	}

	if (!recipientDelegationMember && !recipientSingleParticipant) {
		throw new Error('Recipient is not part of this conference');
	}

	// Create audit record
	const audit = await db.messageAudit.create({
		data: {
			subject: subject,
			body: body,
			senderUserId: sender.id,
			recipientUserId: recipient.id,
			conferenceId: conferenceId,
			status: 'SENT'
		}
	});

	// Render email
	const { html, text } = await renderDelegationMessageEmail({
		senderLabel,
		subject: subject,
		messageBody: body,
		conferenceTitle: conference.title,
		replyUrl: replyUrl
	});

	// Send email
	const result = await emailService.sendEmail({
		to: recipient.email,
		subject: `[${conference.title}] Neue Nachricht: ${subject}`,
		html,
		text
	});

	if (!result.success) {
		console.error('Email sending failed', result.error);

		await db.messageAudit.update({
			where: { id: audit.id },
			data: { status: 'FAILED' }
		});

		throw new Error('Failed to send email');
	}

	// Update audit with message ID
	if (result.messageId) {
		await db.messageAudit.update({
			where: { id: audit.id },
			data: { messageId: result.messageId }
		});
	}

	return 'ok';
}
