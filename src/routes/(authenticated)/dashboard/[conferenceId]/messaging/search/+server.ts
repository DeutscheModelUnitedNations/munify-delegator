import type { RequestHandler } from './$types';
import { db } from '$db/db';
import { getDelegateLabel } from '../utils';
import { oidc } from '$api/context/oidc';

export const GET: RequestHandler = async ({ params, cookies }) => {
	try {
		const conferenceId = params.conferenceId;
		if (!conferenceId) {
			return new Response(JSON.stringify({ error: 'Missing conference id' }), { status: 400 });
		}

		const { user } = await oidc(cookies);
		const currentUserId = user?.sub ?? null;
		if (!currentUserId) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
		}

		const currentDelegationMember = await db.delegationMember.findUnique({
			where: {
				conferenceId_userId: {
					conferenceId: conferenceId,
					userId: currentUserId
				}
			},
			select: {
				delegationId: true
			}
		});

		if (!currentDelegationMember?.delegationId) {
			return new Response(JSON.stringify([]), { headers: { 'content-type': 'application/json' } });
		}

		// Fetch DelegationMembers in the same delegation
		// TODO: Re-enable canReceiveDelegationMail filter after prisma generate is run
		const delegationMembers = await db.delegationMember.findMany({
			where: {
				delegationId: currentDelegationMember.delegationId,
				userId: { not: currentUserId }
				// user: {
				//     canReceiveDelegationMail: true
				// }
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

		const items: Array<{ id: string; label: string }> = [];

		// Process DelegationMembers
		for (const dm of delegationMembers) {
			const name = `${dm.user.given_name} ${dm.user.family_name}`;
			const roleLabel = getDelegateLabel(dm.user, dm, null);
			const label = roleLabel ? `${name} - ${roleLabel}` : name;
			items.push({
				id: dm.user.id,
				label: label
			});
		}

		// Sort items by label
		items.sort((a, b) => a.label.localeCompare(b.label));

		return new Response(JSON.stringify(items), { headers: { 'content-type': 'application/json' } });
	} catch (error) {
		console.error('Search endpoint error:', error);
		return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
	}
};
