import { CombinedError } from '@urql/core';
import { GraphQLError } from 'graphql';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loginUrl, needsSignIn, redirectToLogin } from './loginRedirect';

const failed = (code: string) =>
	new CombinedError({ graphQLErrors: [new GraphQLError('Text', { extensions: { code } })] });

describe('loginUrl', () => {
	it('returns to the page, query and fragment included', () => {
		expect(loginUrl({ pathname: '/dashboard/c1/team', search: '?tab=2', hash: '#x' })).toBe(
			'/login?next=%2Fdashboard%2Fc1%2Fteam%3Ftab%3D2%23x'
		);
	});
});

describe('needsSignIn', () => {
	it('asks for a sign-in when the API answers that nobody is signed in', () => {
		expect(needsSignIn(failed('UNAUTHENTICATED'), '/dashboard')).toBe(true);
	});

	it('leaves other answers and the sign-in page itself alone', () => {
		expect(needsSignIn(failed('FORBIDDEN'), '/dashboard')).toBe(false);
		expect(needsSignIn(undefined, '/dashboard')).toBe(false);
		expect(needsSignIn(failed('UNAUTHENTICATED'), '/login')).toBe(false);
	});
});

describe('redirectToLogin', () => {
	const location = () => ({ pathname: '/dashboard', search: '', hash: '', assign: vi.fn() });

	beforeEach(() => sessionStorage.clear());

	it('sends the browser to the sign-in, coming back to where it was', () => {
		const at = location();
		redirectToLogin(at, 1_000_000);
		expect(at.assign).toHaveBeenCalledWith('/login?next=%2Fdashboard');
	});

	it('does not send it again within the cooldown, so a refused session cannot loop', () => {
		redirectToLogin(location(), 1_000_000);
		const again = location();
		redirectToLogin(again, 1_005_000);
		expect(again.assign).not.toHaveBeenCalled();
		redirectToLogin(again, 1_011_000);
		expect(again.assign).toHaveBeenCalledOnce();
	});
});
