import { type Attribs } from './ResponseTypes';

export interface GetSubscribersRequest {
	page?: number;
	per_page?: number;
	query?: string;
}

export interface CreateSubscriberRequest {
	email: string;
	name: string;
	status?: string;
	lists?: number[];
	list_uuids?: string[];
	preconfirm_subscriptions?: boolean;
	attribs?: Record<string, string | number | boolean>;
}

export interface DeleteSubscriberRequest {
	id: string;
}

export interface UpdateSubscriberRequest {
	email: string;
	name: string;
	status: string;
	lists: number[];
	list_uuids: string[];
	preconfirm_subscriptions: boolean;
	attribs: Attribs;
}

interface BaseRequestforSubscriberListsBulkModification {
	query: string;
	ids: number[];
	action: 'add' | 'remove' | 'unsubscribe';
	target_list_ids: number[];
}
export interface AddRequest extends BaseRequestforSubscriberListsBulkModification {
	action: 'add';
	status: string; // Required when action is "add"
}
export interface RemoveOrUnsubscribeRequest extends BaseRequestforSubscriberListsBulkModification {
	action: 'remove' | 'unsubscribe';
	status?: never; // status is not allowed when action is "remove" or "unsubscribe"
}
export type BulkModifySubscribersListsRequest = AddRequest | RemoveOrUnsubscribeRequest;

export interface GetListsRequest {
	query?: string;
	status?: string[];
	tags?: string[];
	order_by?: 'name' | 'status' | 'created_at' | 'updated_at';
	order?: 'ASC' | 'DESC';
	page?: number;
	per_page?: number;
}

export interface CreateListRequest {
	name: string;
	type: string;
	optin: string;
	tags: string[];
}

export interface UpdateListRequest extends CreateListRequest {}
