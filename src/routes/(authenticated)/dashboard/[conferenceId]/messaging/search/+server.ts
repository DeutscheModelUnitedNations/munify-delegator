import type { RequestHandler } from './$types';
import { db } from '$db/db';
import { getDelegateLabel } from '../utils';

export const GET: RequestHandler = async ({ params }) => {
	const conferenceId = params.conferenceId;

    // Fetch DelegationMembers
    const delegationMembers = await db.delegationMember.findMany({
        where: {
            conferenceId: conferenceId,
            user: {
                canReceiveDelegationMail: true
            }
        },
        include: {
            user: {
                select: {
                    id: true,
                    family_name: true,
                    given_name: true
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

    // Fetch SingleParticipants
    const singleParticipants = await db.singleParticipant.findMany({
        where: {
            conferenceId: conferenceId,
            user: {
                canReceiveDelegationMail: true
            }
        },
        include: {
            user: {
                select: {
                    id: true,
                    family_name: true,
                    given_name: true
                }
            },
            assignedRole: true
        }
    });

    const items = [];

    // Process DelegationMembers
    for (const dm of delegationMembers) {
        const label = getDelegateLabel(dm.user, dm, null);
        if (label) {
             items.push({
                id: dm.user.id,
                label: label
            });
        }
    }

    // Process SingleParticipants
    for (const sp of singleParticipants) {
        if (sp.assignedRole) {
             const label = getDelegateLabel(sp.user, null, sp);
             items.push({
                id: sp.user.id,
                label: label
            });
        }
    }

    // Sort items by label
    items.sort((a, b) => a.label.localeCompare(b.label));

	return new Response(JSON.stringify(items), { headers: { 'content-type': 'application/json' } });
};
