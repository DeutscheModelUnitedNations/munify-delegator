import { parse, type ExecutionResult } from 'graphql';
import { z } from 'zod';
import { feedEvents } from './feedEvents';

/**
 * The query a calendar file reads the schedule with (`feedSchedule.ts`), and what its answer
 * means; free of the API so it is unit tested.
 */

export const SCHEDULE = parse(/* GraphQL */ `
	query CalendarFeed($conferenceId: ID!, $userId: ID!) {
		conferences(where: { id: { eq: $conferenceId } }) {
			id
			title
			timezone
		}
		calendarDays(where: { conferenceId: { eq: $conferenceId } }) {
			id
			tracks {
				id
				committees {
					id
				}
				conferenceRoles {
					id
				}
			}
			entries {
				id
				name
				description
				startTime
				endTime
				room
				updatedAt
				tracks {
					id
				}
				place {
					id
					name
					address
					latitude
					longitude
				}
			}
		}
		delegationMembers(
			where: { participant: { conferenceId: { eq: $conferenceId }, userId: { eq: $userId } } }
		) {
			id
			assignedCommittee {
				id
			}
			delegation {
				id
				assignedRole {
					id
				}
			}
		}
		singleParticipants(
			where: { participant: { conferenceId: { eq: $conferenceId }, userId: { eq: $userId } } }
		) {
			id
			assignedRole {
				id
			}
		}
	}
`);

const idRef = z.object({ id: z.string() });

const scheduleSchema = z.object({
	conferences: z.array(z.object({ title: z.string(), timezone: z.string() })),
	calendarDays: z.array(
		z.object({
			tracks: z.array(
				z.object({
					id: z.string(),
					committees: z.array(idRef),
					conferenceRoles: z.array(idRef)
				})
			),
			entries: z.array(
				z.object({
					id: z.string(),
					name: z.string(),
					description: z.string().nullable(),
					startTime: z.coerce.date(),
					endTime: z.coerce.date(),
					room: z.string().nullable(),
					updatedAt: z.coerce.date(),
					tracks: z.array(idRef),
					place: z
						.object({
							id: z.string(),
							name: z.string(),
							address: z.string().nullable(),
							latitude: z.number().nullable(),
							longitude: z.number().nullable()
						})
						.nullable()
				})
			)
		})
	),
	delegationMembers: z.array(
		z.object({
			assignedCommittee: idRef.nullable(),
			delegation: z.object({ assignedRole: idRef.nullable() })
		})
	),
	singleParticipants: z.array(z.object({ assignedRole: idRef.nullable() }))
});

/**
 * The schedule in an answer to `SCHEDULE`, or undefined when the caller may not read the
 * conference. Throws when the API answered with errors.
 */
export function scheduleOfResult(result: ExecutionResult) {
	if (result.errors?.length) {
		throw new Error('Reading the schedule for a calendar file failed', { cause: result.errors });
	}
	const schedule = scheduleSchema.parse(result.data);
	const conference = schedule.conferences.at(0);
	if (!conference) return undefined;
	return { title: conference.title, timezone: conference.timezone, events: feedEvents(schedule) };
}
