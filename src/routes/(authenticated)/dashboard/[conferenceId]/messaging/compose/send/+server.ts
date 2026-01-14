import type { RequestHandler } from './$types';
import { db } from '$db/db';
import { emailService } from '$api/services/email/emailService';
import { getDelegateLabel } from '../../utils';

export const POST: RequestHandler = async ({ request, locals, params, url }) => {
	const user = locals.user;
	if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const conferenceId = params.conferenceId;

	const bodyData = await request.json();
	const { recipientId, subject, body: messageBody } = bodyData;
	if (!recipientId || !subject || !messageBody)
		return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 });

    // 1. Validate Sender Opt-in
    const sender = await db.user.findUnique({
        where: { id: user.sub },
        select: { canReceiveDelegationMail: true, id: true, given_name: true, family_name: true }
    });

    if (!sender?.canReceiveDelegationMail) {
        return new Response(JSON.stringify({ error: 'You must enable messaging in your account settings.' }), { status: 403 });
    }

    // 2. Validate Recipient Opt-in
    const recipient = await db.user.findUnique({
        where: { id: recipientId },
        select: { canReceiveDelegationMail: true, email: true, id: true }
    });

    if (!recipient?.canReceiveDelegationMail) {
        return new Response(JSON.stringify({ error: 'Recipient has not enabled messaging.' }), { status: 400 });
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
    const dm = await db.delegationMember.findUnique({
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

    let sp = null;
    if (!dm) {
        sp = await db.singleParticipant.findUnique({
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

    const senderLabel = getDelegateLabel(sender, dm, sp);

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
    const replyLink = `${url.origin}/dashboard/${conferenceId}/messaging/compose?recipientId=${sender.id}&subject=Re: ${encodeURIComponent(subject)}`;
    const safeBody = escapeHtml(messageBody).replace(/\n/g, '<br>');

    const html = `
    <p>Hallo,</p>
    <p>Du hast eine neue Nachricht von <strong>${escapeHtml(senderLabel)}</strong> erhalten.</p>
    <p><strong>Betreff:</strong> ${escapeHtml(subject)}</p>
    <p><strong>Nachricht:</strong></p>
    <div style="border-left: 3px solid #ccc; padding-left: 10px; margin: 10px 0;">
        ${safeBody}
    </div>
    <p><a href="${replyLink}">Hier klicken, um zu antworten</a></p>
    <p>Viele Grüße,<br>Das ${escapeHtml(conference.title)} Team</p>
    <p style="font-size: small; color: #888;">Diese Nachricht wurde über das Messaging-System von ${escapeHtml(conference.title)} gesendet. Deine E-Mail-Adresse wurde dem Absender nicht offengelegt.</p>
    `;

    const result = await emailService.sendEmail({
        to: recipient.email,
        subject: `[${conference.title}] Neue Nachricht: ${subject}`,
        html: html,
    });

    if (!result.success) {
        console.error("Email sending failed", result.error);

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

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
