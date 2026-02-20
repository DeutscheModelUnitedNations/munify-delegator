import { renderEmail, DelegationMessageEmail } from '$lib/emails';
import type { DelegationMessageEmailProps } from './types';

export async function renderDelegationMessageEmail(props: DelegationMessageEmailProps) {
	return renderEmail(DelegationMessageEmail, props);
}
