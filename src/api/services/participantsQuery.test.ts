import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, test } from 'vitest';
import {
	participantsCountSql,
	participantsPageSql,
	type ParticipantFilter,
	type ParticipantsPageQuery
} from './participantsQuery';

const dialect = new PgDialect();

/**
 * The `where` clause the filters render to, whitespace collapsed, and its parameters, numbered as
 * if the filters' were the only ones (the conference id comes first, several times).
 */
function whereOf(...filters: ParticipantFilter[]) {
	const { sql, params } = dialect.sqlToQuery(
		participantsCountSql({ conferenceId: 'c', filters, limit: 10, offset: 0 })
	);
	const flat = sql.replace(/\s+/g, ' ');
	const at = flat.lastIndexOf(' where ');
	// the registrations subquery has `where`s of its own; the filters' one follows the status join
	const filterWhere =
		flat.indexOf('conference_participant_status s') < at ? flat.slice(at + 7) : '';
	const own = params.filter((p) => p !== 'c');
	const skipped = params.length - own.length;
	return {
		where: filterWhere.trim().replace(/\$(\d+)/g, (_, n: string) => `$${Number(n) - skipped}`),
		params: own
	};
}

const page = (args: Partial<ParticipantsPageQuery>) => {
	const { sql, params } = dialect.sqlToQuery(
		participantsPageSql({ conferenceId: 'c', limit: 10, offset: 0, ...args }, 10, 20)
	);
	return { sql: sql.replace(/\s+/g, ' '), params };
};

describe('participant filters', () => {
	test('filter nothing without a filter', () => {
		expect(whereOf().where).toBe('');
	});

	test('reject columns that do not exist', () => {
		expect(() => whereOf({ column: 'password' })).toThrow('Unknown participant column: password');
		expect(() => whereOf({ column: 'toString' })).toThrow('Unknown participant column');
	});

	describe('text', () => {
		test('contains by default, escaping wildcards', () => {
			expect(whereOf({ column: 'email', text: '50%_a\\' })).toEqual({
				where: 'u.email ilike $1',
				params: ['%50\\%\\_a\\\\%']
			});
		});

		test('each mode', () => {
			const of = (mode: string) => whereOf({ column: 'city', mode, text: 'Ber' });
			expect(of('equals').where).toBe('lower(u.city) = lower($1)');
			expect(of('equalsNot').where).toBe("lower(coalesce(u.city, '')) <> lower($1)");
			expect(of('startsWith')).toEqual({ where: 'u.city ilike $1', params: ['Ber%'] });
			expect(of('startsWithNot').where).toBe("coalesce(u.city, '') not ilike $1");
			expect(of('containsNot')).toEqual({
				where: "coalesce(u.city, '') not ilike $1",
				params: ['%Ber%']
			});
			expect(of('contains').where).toBe('u.city ilike $1');
			expect(of('somethingElse').where).toBe('u.city ilike $1');
		});

		test('emptiness, regardless of text', () => {
			expect(whereOf({ column: 'city', mode: 'isEmpty' }).where).toBe(
				"(u.city is null or u.city = '')"
			);
			expect(whereOf({ column: 'city', mode: 'isNotEmpty', text: 'x' }).where).toBe(
				"(u.city is not null and u.city <> '')"
			);
		});

		test('no text filters nothing', () => {
			expect(whereOf({ column: 'city', mode: 'equals' }).where).toBe('');
			expect(whereOf({ column: 'city', text: '' }).where).toBe('');
		});
	});

	describe('enum', () => {
		test('the values picked, `—` meaning none', () => {
			expect(whereOf({ column: 'gender', values: ['MALE', '—'] })).toEqual({
				where: '(u.gender::text in ($1) or u.gender::text is null)',
				params: ['MALE']
			});
			expect(whereOf({ column: 'gender', values: ['—'] }).where).toBe('(u.gender::text is null)');
			expect(whereOf({ column: 'gender', values: ['A', 'B'] }).where).toBe(
				'(u.gender::text in ($1, $2))'
			);
		});

		test('nothing picked filters nothing', () => {
			expect(whereOf({ column: 'role', values: [] }).where).toBe('');
			expect(whereOf({ column: 'role' }).where).toBe('');
		});
	});

	describe('bool', () => {
		test('either way, or not at all', () => {
			expect(whereOf({ column: 'accepted', bool: true })).toEqual({
				where: 'reg.accepted = $1',
				params: [true]
			});
			expect(whereOf({ column: 'accepted', bool: false }).params).toEqual([false]);
			expect(whereOf({ column: 'accepted', bool: null }).where).toBe('');
			expect(whereOf({ column: 'accepted' }).where).toBe('');
		});
	});

	describe('number', () => {
		test('either bound, both, or none', () => {
			expect(whereOf({ column: 'birthday', min: 1 }).where).toBe('(u.birthday >= $1)');
			expect(whereOf({ column: 'birthday', max: 0 }).where).toBe('(u.birthday <= $1)');
			expect(whereOf({ column: 'birthday', min: 1, max: 2 })).toEqual({
				where: '(u.birthday >= $1 and u.birthday <= $2)',
				params: [1, 2]
			});
			expect(whereOf({ column: 'birthday', min: null }).where).toBe('');
		});
	});

	describe('nation', () => {
		const expr = 'coalesce(reg.nsa_name, reg.nation_code)';

		test('codes or a non-state actor name', () => {
			expect(whereOf({ column: 'nation', values: ['DEU', 'FRA'], text: 'Gr' })).toEqual({
				where: '(reg.nation_code in ($1, $2) or reg.nsa_name ilike $3)',
				params: ['DEU', 'FRA', '%Gr%']
			});
			expect(whereOf({ column: 'nation', text: 'Gr' }).where).toBe('(reg.nsa_name ilike $1)');
		});

		test('negated', () => {
			expect(whereOf({ column: 'nation', values: ['DEU'], mode: 'containsNot' }).where).toBe(
				'not coalesce((reg.nation_code in ($1)), false)'
			);
			expect(whereOf({ column: 'nation', text: 'x', mode: 'equalsNot' }).where).toBe(
				'not coalesce((reg.nsa_name ilike $1), false)'
			);
		});

		test('emptiness', () => {
			expect(whereOf({ column: 'nation', mode: 'isEmpty', text: 'x' }).where).toBe(
				`${expr} is null`
			);
			expect(whereOf({ column: 'nation', mode: 'isNotEmpty' }).where).toBe(`${expr} is not null`);
		});

		test('a search that matches no code matches nobody, none filters nothing', () => {
			expect(whereOf({ column: 'nation', values: [] }).where).toBe('false');
			expect(whereOf({ column: 'nation' }).where).toBe('');
		});
	});

	test('several filters all apply', () => {
		expect(whereOf({ column: 'accepted', bool: true }, { column: 'birthday', min: 3 }).where).toBe(
			'reg.accepted = $1 and (u.birthday >= $2)'
		);
	});
});

describe('participants page', () => {
	test('search words match name or email, five at most', () => {
		const { sql, params } = page({ search: ' a  b c d e f ' });
		expect(sql).toContain('(u.given_name ilike $');
		expect(params.filter((p) => typeof p === 'string' && p.startsWith('%'))).toHaveLength(15);
		expect(params).not.toContain('%f%');
	});

	test('orders as asked, then by name and id, skipping unknown columns', () => {
		const { sql, params } = page({
			sort: [
				{ column: 'family_name', desc: true },
				{ column: 'nope', desc: false },
				{ column: 'city', desc: false }
			]
		});
		expect(sql).toContain(
			'order by u.family_name desc nulls last, u.city asc nulls last, u.family_name asc, reg.user_id asc'
		);
		expect(params.slice(-2)).toEqual([11, 20]);
	});

	test('counts seats only when a filter or the order uses them', () => {
		expect(page({}).sql).not.toContain(') pc on pc.user_id');
		expect(page({ sort: [{ column: 'participationCount', desc: false }] }).sql).toContain(
			') pc on pc.user_id'
		);
		expect(page({ filters: [{ column: 'participationCount', min: 2 }] }).sql).toContain(
			'coalesce(pc.n, 0) >= $'
		);
	});
});
