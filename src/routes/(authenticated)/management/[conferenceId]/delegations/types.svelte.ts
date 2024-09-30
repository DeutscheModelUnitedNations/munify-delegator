import type { ExtractReturnType } from '$lib/global/apiTypes';
import type { APIType } from '$lib/global/apiState.svelte';

export type DelegationData = ExtractReturnType<APIType["delegation"]["get"]>;
export type DelegationDataItem = DelegationData[number];