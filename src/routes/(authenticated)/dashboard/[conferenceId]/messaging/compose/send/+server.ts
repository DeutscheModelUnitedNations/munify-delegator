import type { RequestHandler } from './$types';
import { db } from '$db/db';
import { emailService } from '$api/services/email/emailService';
import { renderDelegationMessageEmail } from '$api/services/email/delegationMessageTemplates';
import { getDelegateLabel } from '../../utils';
import { oidc } from '$api/context/oidc';

export const POST: RequestHandler = async ({ request, cookies, params, url }) => {
	const { user: authUser } = await oidc(cookies);
	if (!authUser?.sub) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
	}

	const conferenceId = params.conferenceId;
	if (!conferenceId) {
		return new Response(JSON.stringify({ error: 'Missing conference id' }), { status: 400 });
	}

	const bodyData = await request.json();
	const { recipientId, subject, body: messageBody } = bodyData;
	if (!recipientId || !subject || !messageBody) {
		return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 });
	}

	if (recipientId === authUser.sub) {
		return new Response(JSON.stringify({ error: 'Cannot send to yourself' }), { status: 400 });
	}

	// 1. Validate Sender Opt-in
	const sender = await db.user.findUnique({
		where: { id: authUser.sub },
		select: {
			canReceiveDelegationMail: true,
			id: true,
			given_name: true,
			family_name: true
		}
	});

	if (!sender) {
		return new Response(JSON.stringify({ error: 'Sender not found' }), { status: 404 });
	}

	if (!sender?.canReceiveDelegationMail) {
		return new Response(
			JSON.stringify({ error: 'You must enable messaging in your account settings.' }),
			{ status: 403 }
		);
	}

	// 2. Validate Recipient Opt-in
	const recipient = await db.user.findUnique({
		where: { id: recipientId },
		select: {
			canReceiveDelegationMail: true,
			email: true,
			id: true
		}
	});

	if (!recipient) {
		return new Response(JSON.stringify({ error: 'Recipient not found' }), { status: 404 });
	}

	if (!recipient?.canReceiveDelegationMail) {
		return new Response(JSON.stringify({ error: 'Recipient has not enabled messaging.' }), {
			status: 400
		});
	}

	// 3. Get Conference Details
	const conference = await db.conference.findUnique({
		where: { id: conferenceId },
		select: { title: true }
	});

	if (!conference) {
		return new Response(JSON.stringify({ error: 'Conference not found' }), { status: 404 });
	}

	// 4. Determine Sender Label (Role)
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

	let senderSingleParticipant: Awaited<ReturnType<typeof db.singleParticipant.findUnique>> = null;
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
		return new Response(JSON.stringify({ error: 'Sender is not part of this conference' }), {
			status: 403
		});
	}

	const senderLabel = getDelegateLabel(sender, senderDelegationMember, senderSingleParticipant);

	const recipientDelegationMember = await db.delegationMember.findUnique({
		where: {
			conferenceId_userId: {
				conferenceId: conferenceId,
				userId: recipient.id
			}
		}
	});

	let recipientSingleParticipant: Awaited<ReturnType<typeof db.singleParticipant.findUnique>> =
		null;
	if (!recipientDelegationMember) {
		recipientSingleParticipant = await db.singleParticipant.findUnique({
			where: {
				conferenceId_userId: {
					conferenceId: conferenceId,
					userId: recipient.id
				}
			}
		});
	}

	if (!recipientDelegationMember && !recipientSingleParticipant) {
		return new Response(JSON.stringify({ error: 'Recipient is not part of this conference' }), {
			status: 400
		});
	}

	// 5. Create MessageAudit (Optimistic)
	const audit = await db.messageAudit.create({
		data: {
			subject,
			body: messageBody,
			senderUserId: sender.id,
			recipientUserId: recipient.id,
			conferenceId,
			status: 'SENT'
		}
	});

	// 6. Send Email
	const replySubject = `Re: ${subject}`;
	const replyLink = `${url.origin}/dashboard/${conferenceId}/messaging/compose?recipientId=${encodeURIComponent(sender.id)}&subject=${encodeURIComponent(replySubject)}`;

	const { html, text } = await renderDelegationMessageEmail({
		senderLabel,
		subject,
		messageBody,
		conferenceTitle: conference.title,
		replyUrl: replyLink
	});

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

		return new Response(JSON.stringify({ error: 'Failed to send email' }), { status: 500 });
	} else {
		// Update with messageId if available
		if (result.messageId) {
			await db.messageAudit.update({
				where: { id: audit.id },
				data: { messageId: result.messageId }
			});
		}
	}

	return new Response(JSON.stringify({ status: 'ok' }), {
		headers: { 'content-type': 'application/json' }
	});
};
