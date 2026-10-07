import { sql, type SQL } from 'drizzle-orm';
import { GraphQLError } from 'graphql';

type Kind = 'text' | 'enum' | 'bool' | 'number';

/** What a table column is in SQL. The aliases are those of `pageQuery`. */
const columns: Record<string, { expr: SQL; kind: Kind }> = {
	userId: { expr: sql`reg.user_id`, kind: 'text' },
	family_name: { expr: sql`u.family_name`, kind: 'text' },
	given_name: { expr: sql`u.given_name`, kind: 'text' },
	email: { expr: sql`u.email`, kind: 'text' },
	phone: { expr: sql`u.phone`, kind: 'text' },
	birthday: { expr: sql`u.birthday`, kind: 'number' },
	pronouns: { expr: sql`u.pronouns`, kind: 'text' },
	city: { expr: sql`u.city`, kind: 'text' },
	country: { expr: sql`u.country`, kind: 'text' },
	gender: { expr: sql`u.gender::text`, kind: 'enum' },
	foodPreference: { expr: sql`u.food_preference::text`, kind: 'enum' },
	ageAtConference: {
		expr: sql`date_part('year', age(c.start_conference, u.birthday))`,
		kind: 'number'
	},
	// a birthday (rolling Feb 29 over to March 1, like a JS date) in the days of the conference
	hasBirthdayDuringConference: {
		expr: sql`(u.birthday is not null and exists (
			select 1 from generate_series(
				extract(year from c.start_conference)::int,
				extract(year from c.end_conference)::int
			) as y
			where make_date(y, extract(month from u.birthday)::int, 1) + (extract(day from u.birthday)::int - 1)
				between c.start_conference::date and c.end_conference::date
		))`,
		kind: 'bool'
	},
	role: { expr: sql`reg.role`, kind: 'enum' },
	nation: { expr: sql`coalesce(reg.nsa_name, reg.nation_code)`, kind: 'text' },
	committee: { expr: sql`reg.committee`, kind: 'text' },
	delegationSchool: { expr: sql`reg.school`, kind: 'text' },
	isHeadDelegate: { expr: sql`reg.is_head_delegate`, kind: 'bool' },
	assignedRoleName: { expr: sql`reg.assigned_role_name`, kind: 'text' },
	teamRole: { expr: sql`reg.team_role`, kind: 'enum' },
	plansOwnAttendance: { expr: sql`reg.plans_own_attendance`, kind: 'bool' },
	paymentStatus: { expr: sql`coalesce(s.payment_status::text, 'PENDING')`, kind: 'enum' },
	termsAndConditions: {
		expr: sql`coalesce(s.terms_and_conditions::text, 'PENDING')`,
		kind: 'enum'
	},
	guardianConsent: { expr: sql`coalesce(s.guardian_consent::text, 'PENDING')`, kind: 'enum' },
	mediaConsent: { expr: sql`coalesce(s.media_consent::text, 'PENDING')`, kind: 'enum' },
	// as the table has always computed it: a problem anywhere, else done when terms and media are
	// done and the guardian consent is, or the person is of age
	postalRegistrationStatus: {
		expr: sql`(case
			when s.id is null then 'PENDING'
			when s.terms_and_conditions = 'PROBLEM' or s.media_consent = 'PROBLEM' or s.guardian_consent = 'PROBLEM' then 'PROBLEM'
			when s.terms_and_conditions = 'DONE' and s.media_consent = 'DONE'
				and (s.guardian_consent = 'DONE' or coalesce(date_part('year', age(c.start_conference, u.birthday)), 0) >= 18) then 'DONE'
			else 'PENDING' end)`,
		kind: 'enum'
	},
	didAttend: { expr: sql`s.did_attend`, kind: 'bool' },
	documentNumber: { expr: sql`s.assigend_document_number::text`, kind: 'text' },
	accessCardId: { expr: sql`s.access_card_id`, kind: 'text' },
	accepted: { expr: sql`reg.accepted`, kind: 'bool' },
	hasOpenIssue: {
		expr: sql`(reg.accepted and reg.role <> 'TEAM_MEMBER' and (
			coalesce(s.payment_status::text, 'PENDING') <> 'DONE'
			or (case
				when s.id is null then 'PENDING'
				when s.terms_and_conditions = 'PROBLEM' or s.media_consent = 'PROBLEM' or s.guardian_consent = 'PROBLEM' then 'PROBLEM'
				when s.terms_and_conditions = 'DONE' and s.media_consent = 'DONE'
					and (s.guardian_consent = 'DONE' or coalesce(date_part('year', age(c.start_conference, u.birthday)), 0) >= 18) then 'DONE'
				else 'PENDING' end) <> 'DONE'))`,
		kind: 'bool'
	},
	// seats actually held, in any conference: delegates of a seated delegation, seated singles.
	// Joined (see `participantsPageSql`) only when a filter or the order asks for it.
	participationCount: { expr: sql`coalesce(pc.n, 0)`, kind: 'number' }
};

const like = (value: string) => `%${value.replace(/[\\%_]/g, '\\$&')}%`;

export interface ParticipantFilter {
	column: string;
	mode?: string | null;
	text?: string | null;
	values?: string[] | null;
	bool?: boolean | null;
	min?: number | null;
	max?: number | null;
}

export interface ParticipantsPageQuery {
	conferenceId: string;
	search?: string | null;
	filters?: ParticipantFilter[] | null;
	sort?: { column: string; desc: boolean }[] | null;
	limit: number;
	offset: number;
}

const inList = (expr: SQL, values: string[]) =>
	sql`${expr} in (${sql.join(
		values.map((v) => sql`${v}`),
		sql`, `
	)})`;

type ConditionOf = (filter: ParticipantFilter, expr: SQL) => SQL | undefined;

/** Picked codes match the nation, typed text the name of a non-state actor. */
function nationMatches(filter: ParticipantFilter): SQL | undefined {
	const parts: SQL[] = [];
	if (filter.values?.length) parts.push(inList(sql`reg.nation_code`, filter.values));
	if (filter.text) parts.push(sql`reg.nsa_name ilike ${like(filter.text)}`);
	if (parts.length === 0) return filter.text || filter.values ? sql`false` : undefined;
	return sql`(${sql.join(parts, sql` or `)})`;
}

const nationCondition: ConditionOf = (filter, expr) => {
	if (filter.mode === 'isEmpty') return sql`${expr} is null`;
	if (filter.mode === 'isNotEmpty') return sql`${expr} is not null`;
	const matches = nationMatches(filter);
	if (!matches) return undefined;
	return filter.mode === 'containsNot' || filter.mode === 'equalsNot'
		? sql`not coalesce(${matches}, false)`
		: matches;
};

const boolCondition: ConditionOf = (filter, expr) =>
	filter.bool === null || filter.bool === undefined ? undefined : sql`${expr} = ${filter.bool}`;

const numberCondition: ConditionOf = (filter, expr) => {
	const bounds: SQL[] = [];
	if (typeof filter.min === 'number') bounds.push(sql`${expr} >= ${filter.min}`);
	if (typeof filter.max === 'number') bounds.push(sql`${expr} <= ${filter.max}`);
	return bounds.length > 0 ? sql`(${sql.join(bounds, sql` and `)})` : undefined;
};

/** The values picked; `—` stands for "no value". */
const enumCondition: ConditionOf = (filter, expr) => {
	const values = filter.values ?? [];
	if (values.length === 0) return undefined;
	const real = values.filter((value) => value !== '—');
	const parts: SQL[] = [];
	if (real.length > 0) parts.push(inList(expr, real));
	if (real.length !== values.length) parts.push(sql`${expr} is null`);
	return sql`(${sql.join(parts, sql` or `)})`;
};

/** How each text mode compares, given text that is not empty. Unknown modes mean `contains`. */
const textModes: Record<string, (expr: SQL, text: string) => SQL> = {
	equals: (expr, text) => sql`lower(${expr}) = lower(${text})`,
	equalsNot: (expr, text) => sql`lower(coalesce(${expr}, '')) <> lower(${text})`,
	startsWith: (expr, text) => sql`${expr} ilike ${like(text).slice(1)}`,
	startsWithNot: (expr, text) => sql`coalesce(${expr}, '') not ilike ${like(text).slice(1)}`,
	containsNot: (expr, text) => sql`coalesce(${expr}, '') not ilike ${like(text)}`,
	contains: (expr, text) => sql`${expr} ilike ${like(text)}`
};

const textCondition: ConditionOf = (filter, expr) => {
	const mode = filter.mode ?? 'contains';
	if (mode === 'isEmpty') return sql`(${expr} is null or ${expr} = '')`;
	if (mode === 'isNotEmpty') return sql`(${expr} is not null and ${expr} <> '')`;
	const text = filter.text ?? '';
	if (!text) return undefined;
	return (Object.hasOwn(textModes, mode) ? textModes[mode] : textModes.contains)(expr, text);
};

const conditionByKind: Record<Kind, ConditionOf> = {
	bool: boolCondition,
	number: numberCondition,
	enum: enumCondition,
	text: textCondition
};

/** The condition one filter means, or `undefined` when it filters nothing. */
function condition(filter: ParticipantFilter): SQL | undefined {
	const column = Object.hasOwn(columns, filter.column) ? columns[filter.column] : undefined;
	if (!column) throw new GraphQLError(`Unknown participant column: ${filter.column}`);
	const conditionOf = filter.column === 'nation' ? nationCondition : conditionByKind[column.kind];
	return conditionOf(filter, column.expr);
}

/** Each of the first five words of the search has to appear in the name or the email. */
function searchConditions(search: string | null | undefined) {
	return (search ?? '')
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 5)
		.map(
			(word) =>
				sql`(u.given_name ilike ${like(word)} or u.family_name ilike ${like(word)} or u.email ilike ${like(word)})`
		);
}

/** The order asked for; columns that do not exist are left out. */
function orderOf(sort: ParticipantsPageQuery['sort']) {
	return (sort ?? []).flatMap(({ column, desc }) => {
		const found = Object.hasOwn(columns, column) ? columns[column] : undefined;
		return found ? [sql`${found.expr} ${desc ? sql`desc` : sql`asc`} nulls last`] : [];
	});
}

/** Every registration of the conference as one row: the person, how they take part, whether seated. */
function registrations(conferenceId: string) {
	const seated = sql`(d.assigned_nation_alpha3_code is not null or d.assigned_non_state_actor_id is not null)`;
	return sql`
		select dm.user_id, 'DELEGATION_MEMBER' as role, d.assigned_nation_alpha3_code as nation_code,
			nsa.name as nsa_name, com.name as committee, d.school as school,
			dm.is_head_delegate as is_head_delegate, null::text as assigned_role_name,
			null::text as team_role, null::boolean as plans_own_attendance, ${seated} as accepted
		from delegation_member dm
		join delegation d on d.id = dm.delegation_id
		left join non_state_actor nsa on nsa.id = d.assigned_non_state_actor_id
		left join committee com on com.id = dm.assigned_committee_id
		where dm.conference_id = ${conferenceId}
		union all
		select cs.user_id, 'SUPERVISOR', null, null, null, null, null, null, null,
			cs.plans_own_attendence_at_conference,
			(exists (
				select 1 from conference_supervisor_to_delegation_member j
				join delegation_member dm2 on dm2.id = j.b
				join delegation d on d.id = dm2.delegation_id
				where j.a = cs.id and ${seated}
			) or exists (
				select 1 from conference_supervisor_to_single_participant j
				join single_participant sp2 on sp2.id = j.b
				where j.a = cs.id and sp2.assigned_role_id is not null
			))
		from conference_supervisor cs
		where cs.conference_id = ${conferenceId}
		union all
		select sp.user_id, 'SINGLE_PARTICIPANT', null, null, null, sp.school, null,
			role.name, null, null, sp.assigned_role_id is not null
		from single_participant sp
		left join custom_conference_role role on role.id = sp.assigned_role_id
		where sp.conference_id = ${conferenceId}
		union all
		select tm.user_id, 'TEAM_MEMBER', null, null, null, null, null, null,
			tm.role::text, null, true
		from team_member tm
		where tm.conference_id = ${conferenceId}
	`;
}

/** The `from … where …` of everyone matching the search and filters, and the order asked for. */
function matching(args: Omit<ParticipantsPageQuery, 'limit' | 'offset'>) {
	const filters = args.filters ?? [];
	const conditions = [
		...filters.flatMap((filter) => condition(filter) ?? []),
		...searchConditions(args.search)
	];
	const orders = orderOf(args.sort);
	const usesCount = [...filters, ...(args.sort ?? [])].some(
		(entry) => entry.column === 'participationCount'
	);
	// seats held across all conferences, counted only for the people of this one
	const participationCounts = usesCount
		? sql`left join (
			select seats.user_id, count(*) as n from (
				select dm.user_id from delegation_member dm
				join delegation d on d.id = dm.delegation_id
				where d.assigned_nation_alpha3_code is not null or d.assigned_non_state_actor_id is not null
				union all
				select sp.user_id from single_participant sp where sp.assigned_role_id is not null
			) seats group by seats.user_id
		) pc on pc.user_id = reg.user_id`
		: sql``;
	const from = sql`
		from (${registrations(args.conferenceId)}) as reg
		join "user" u on u.id = reg.user_id
		${participationCounts}
		join conference c on c.id = ${args.conferenceId}
		left join conference_participant_status s
			on s.user_id = reg.user_id and s.conference_id = ${args.conferenceId}
		${conditions.length > 0 ? sql`where ${sql.join(conditions, sql` and `)}` : sql``}
	`;
	return { from, orders };
}

/** The statement selecting one page of user ids (one more than `limit`, to tell if more follow). */
export function participantsPageSql(args: ParticipantsPageQuery, limit: number, offset: number) {
	const { from, orders } = matching(args);
	return sql`
		select reg.user_id
		${from}
		order by ${sql.join([...orders, sql`u.family_name asc`, sql`reg.user_id asc`], sql`, `)}
		limit ${limit + 1} offset ${offset}
	`;
}

/** The statement counting everyone the page's search and filters match, across all pages. */
export function participantsCountSql(args: ParticipantsPageQuery) {
	return sql`select count(*)::int as total ${matching(args).from}`;
}
