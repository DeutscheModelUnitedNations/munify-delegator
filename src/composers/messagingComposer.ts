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

export type RecipientInfo = {
	id: string;
	label: string;
	firstName: string | null;
	lastName: string | null;
	alpha2Code: string | null;
	alpha3Code: string | null;
	fontAwesomeIcon: string | null;
	roleName: string | null;
};

export type RecipientGroup = {
	groupId: string;
	groupLabel: string;
	category: 'COMMITTEE' | 'NSA' | 'CUSTOM_ROLE';
	fontAwesomeIcon: string | null;
	recipients: RecipientInfo[];
};

export async function getMessageRecipients(
	conferenceId: string,
	userId: string
): Promise<RecipientGroup[]> {
	const seenUserIds = new Set<string>();

	// Query all DelegationMembers in the conference with messaging enabled, excluding current user
	const delegationMembers = await db.delegationMember.findMany({
		where: {
			conferenceId,
			userId: { not: userId },
			user: { canReceiveDelegationMail: true }
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

	// Query all SingleParticipants in the conference with messaging enabled, excluding current user
	const singleParticipants = await db.singleParticipant.findMany({
		where: {
			conferenceId,
			userId: { not: userId },
			user: { canReceiveDelegationMail: true }
		},
		include: {
			user: {
				select: {
					id: true,
					given_name: true,
					family_name: true
				}
			},
			assignedRole: true
		}
	});

	// Group DelegationMembers by committee
	const committeeGroups = new Map<string, { label: string; recipients: RecipientInfo[] }>();

	// Group DelegationMembers by NSA (those with no assignedCommittee but with assignedNonStateActor)
	const nsaGroups = new Map<
		string,
		{ label: string; fontAwesomeIcon: string | null; recipients: RecipientInfo[] }
	>();

	for (const member of delegationMembers) {
		if (!member.user || seenUserIds.has(member.user.id)) continue;
		seenUserIds.add(member.user.id);

		const userObj = member.user;
		const roleLabel = getDelegateLabel(userObj, member, null);
		const label = `${roleLabel} - ${userObj.given_name} ${userObj.family_name}`;

		if (member.assignedCommittee) {
			const key = member.assignedCommittee.id;
			if (!committeeGroups.has(key)) {
				const committeeLabel = member.assignedCommittee.abbreviation
					? `${member.assignedCommittee.name} (${member.assignedCommittee.abbreviation})`
					: member.assignedCommittee.name;
				committeeGroups.set(key, {
					label: committeeLabel,
					recipients: []
				});
			}
			const committeeName = member.assignedCommittee.abbreviation || member.assignedCommittee.name;
			committeeGroups.get(key)!.recipients.push({
				id: userObj.id,
				label,
				firstName: userObj.given_name,
				lastName: userObj.family_name,
				alpha2Code: member.delegation.assignedNation?.alpha2Code ?? null,
				alpha3Code: member.delegation.assignedNation?.alpha3Code ?? null,
				fontAwesomeIcon: null,
				roleName: committeeName
			});
		} else if (member.delegation.assignedNonStateActor) {
			const nsa = member.delegation.assignedNonStateActor;
			const key = nsa.id;
			if (!nsaGroups.has(key)) {
				nsaGroups.set(key, {
					label: nsa.name,
					fontAwesomeIcon: nsa.fontAwesomeIcon,
					recipients: []
				});
			}
			nsaGroups.get(key)!.recipients.push({
				id: userObj.id,
				label,
				firstName: userObj.given_name,
				lastName: userObj.family_name,
				alpha2Code: null,
				alpha3Code: null,
				fontAwesomeIcon: nsa.fontAwesomeIcon,
				roleName: nsa.name
			});
		}
	}

	// Group SingleParticipants by assignedRole
	const roleGroups = new Map<
		string,
		{ label: string; fontAwesomeIcon: string | null; recipients: RecipientInfo[] }
	>();

	for (const participant of singleParticipants) {
		if (!participant.user || seenUserIds.has(participant.user.id)) continue;
		seenUserIds.add(participant.user.id);

		if (!participant.assignedRole) continue;

		const userObj = participant.user;
		const roleLabel = getDelegateLabel(userObj, null, participant);
		const label = `${roleLabel} - ${userObj.given_name} ${userObj.family_name}`;

		const key = participant.assignedRole.id;
		if (!roleGroups.has(key)) {
			roleGroups.set(key, {
				label: participant.assignedRole.name,
				fontAwesomeIcon: participant.assignedRole.fontAwesomeIcon,
				recipients: []
			});
		}
		roleGroups.get(key)!.recipients.push({
			id: userObj.id,
			label,
			firstName: userObj.given_name,
			lastName: userObj.family_name,
			alpha2Code: null,
			alpha3Code: null,
			fontAwesomeIcon: participant.assignedRole.fontAwesomeIcon,
			roleName: participant.assignedRole.name
		});
	}

	// Build result, sorting recipients within each group
	const groups: RecipientGroup[] = [];

	for (const [groupId, group] of committeeGroups) {
		group.recipients.sort((a, b) => a.label.localeCompare(b.label));
		groups.push({
			groupId,
			groupLabel: group.label,
			category: 'COMMITTEE',
			fontAwesomeIcon: null,
			recipients: group.recipients
		});
	}

	for (const [groupId, group] of nsaGroups) {
		group.recipients.sort((a, b) => a.label.localeCompare(b.label));
		groups.push({
			groupId,
			groupLabel: group.label,
			category: 'NSA',
			fontAwesomeIcon: group.fontAwesomeIcon,
			recipients: group.recipients
		});
	}

	for (const [groupId, group] of roleGroups) {
		group.recipients.sort((a, b) => a.label.localeCompare(b.label));
		groups.push({
			groupId,
			groupLabel: group.label,
			category: 'CUSTOM_ROLE',
			fontAwesomeIcon: group.fontAwesomeIcon,
			recipients: group.recipients
		});
	}

	// Sort groups by label
	groups.sort((a, b) => a.groupLabel.localeCompare(b.groupLabel));

	return groups;
}

export type ReplyMessageData = {
	id: string;
	subject: string;
	body: string;
	senderLabel: string;
	senderUserId: string;
	senderFirstName: string;
	senderLastName: string;
	senderAlpha2Code: string | null;
	senderAlpha3Code: string | null;
	senderFontAwesomeIcon: string | null;
	senderRoleName: string | null;
	sentAt: string;
};

export async function getMessageForReply(
	messageAuditId: string,
	conferenceId: string,
	userId: string
): Promise<ReplyMessageData | null> {
	const audit = await db.messageAudit.findUnique({
		where: { id: messageAuditId },
		select: {
			id: true,
			subject: true,
			body: true,
			createdAt: true,
			senderUserId: true,
			recipientUserId: true,
			conferenceId: true,
			senderUser: {
				select: {
					id: true,
					given_name: true,
					family_name: true
				}
			}
		}
	});

	if (!audit || audit.conferenceId !== conferenceId || audit.recipientUserId !== userId) {
		return null;
	}

	// Look up sender's delegation/role info for the label
	const senderDelegationMember = await db.delegationMember.findUnique({
		where: {
			conferenceId_userId: {
				conferenceId,
				userId: audit.senderUserId
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
		assignedRole: { name: string; fontAwesomeIcon: string | null } | null;
	} | null;
	if (!senderDelegationMember) {
		senderSingleParticipant = await db.singleParticipant.findUnique({
			where: {
				conferenceId_userId: {
					conferenceId,
					userId: audit.senderUserId
				}
			},
			include: {
				assignedRole: true
			}
		});
	}

	const senderLabel = getDelegateLabel(
		audit.senderUser,
		senderDelegationMember,
		senderSingleParticipant
	);

	// Derive recipient-info fields for display
	const senderAlpha2Code = senderDelegationMember?.delegation.assignedNation?.alpha2Code ?? null;
	const senderAlpha3Code = senderDelegationMember?.delegation.assignedNation?.alpha3Code ?? null;
	const senderFontAwesomeIcon =
		senderDelegationMember?.delegation.assignedNonStateActor?.fontAwesomeIcon ??
		senderSingleParticipant?.assignedRole?.fontAwesomeIcon ??
		null;
	const senderRoleName =
		senderDelegationMember?.assignedCommittee?.abbreviation ??
		senderDelegationMember?.assignedCommittee?.name ??
		senderDelegationMember?.delegation.assignedNonStateActor?.name ??
		senderSingleParticipant?.assignedRole?.name ??
		null;

	return {
		id: audit.id,
		subject: audit.subject,
		body: audit.body,
		senderLabel,
		senderUserId: audit.senderUserId,
		senderFirstName: audit.senderUser.given_name,
		senderLastName: audit.senderUser.family_name,
		senderAlpha2Code,
		senderAlpha3Code,
		senderFontAwesomeIcon,
		senderRoleName,
		sentAt: audit.createdAt.toISOString()
	};
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
	origin,
	senderId,
	replyToMessageId
}: {
	conferenceId: string;
	recipientId: string;
	subject: string;
	body: string;
	origin: string;
	senderId: string;
	replyToMessageId?: string;
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

	// Build reply URL from the new audit ID
	const replyUrl = `${origin}/dashboard/${conferenceId}/messaging/compose?replyTo=${audit.id}`;

	// Build quoted message if this is a reply
	let quotedMessage:
		| { senderLabel: string; subject: string; body: string; sentAt: string }
		| undefined;
	if (replyToMessageId) {
		const originalAudit = await db.messageAudit.findUnique({
			where: { id: replyToMessageId },
			select: {
				subject: true,
				body: true,
				createdAt: true,
				senderUserId: true,
				senderUser: {
					select: { given_name: true, family_name: true }
				}
			}
		});
		if (originalAudit) {
			const origSenderDM = await db.delegationMember.findUnique({
				where: {
					conferenceId_userId: { conferenceId, userId: originalAudit.senderUserId }
				},
				include: {
					delegation: { include: { assignedNation: true, assignedNonStateActor: true } },
					assignedCommittee: true
				}
			});
			let origSenderSP = null as { assignedRole: { name: string } | null } | null;
			if (!origSenderDM) {
				origSenderSP = await db.singleParticipant.findUnique({
					where: {
						conferenceId_userId: { conferenceId, userId: originalAudit.senderUserId }
					},
					include: { assignedRole: true }
				});
			}
			const origLabel = getDelegateLabel(originalAudit.senderUser, origSenderDM, origSenderSP);
			quotedMessage = {
				senderLabel: origLabel,
				subject: originalAudit.subject,
				body: originalAudit.body,
				sentAt: originalAudit.createdAt.toISOString()
			};
		}
	}

	// Render email
	const { html, text } = await renderDelegationMessageEmail({
		senderLabel,
		subject: subject,
		messageBody: body,
		conferenceTitle: conference.title,
		replyUrl,
		quotedMessage
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
