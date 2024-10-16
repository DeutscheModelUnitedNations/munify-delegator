import type {
	BulkModifySubscribersListsRequest,
	CreateListRequest,
	CreateSubscriberRequest,
	GetListsRequest,
	UpdateListRequest,
	UpdateSubscriberRequest
} from './RequestTypes';
import type {
	CreateSubscriberResponse,
	BaseBooleanConfirmation,
	GetSubscribersResponse,
	UpdateSubscriberResponse,
	GetListsResponse,
	GetListResponse,
	CreateListResponse,
	UpdateListResponse
} from './ResponseTypes';

interface params {
	[key: string]: string | number | boolean | undefined;
}

function constructParams(params: params): string {
	if (!params) return '';

	// remove undefined values
	Object.keys(params).forEach((key) => params[key] === undefined && delete params[key]);

	return `?${Object.keys(params)
		.map((key) => `${key}=${params[key]}`)
		.join('&')}`;
}

/**
 * Listmonk is a class that provides methods for interacting with the Listmonk API.
 */
export default class Listmonk {
	baseUrl: string;
	userName: string;
	password: string;

	constructor(baseUrl: string, userName: string, password: string) {
		this.baseUrl = baseUrl;
		this.userName = userName;
		this.password = password;
	}

	private constructUrl(endpoint: string, params?: params): string {
		if (params) {
			const paramString = constructParams(params);
			return `${this.baseUrl}${endpoint}${paramString}`;
		}
		return `${this.baseUrl}${endpoint}`;
	}

	private getHeaders() {
		return {
			Authorization: `Basic ${btoa(`${this.userName}:${this.password}`)}`,
			'Content-Type': 'application/json'
		};
	}

	/**
	 * Retrieves a list of subscribers based on the specified parameters.
	 *
	 * @param {number} page - The page number of the subscribers to retrieve.
	 * @param {number} per_page - The number of subscribers to retrieve per page.
	 * @param {string} query - The search query to filter subscribers. SQL expression
	 * @returns {Promise<GetSubscribersResponse>} - A promise that resolves to a GetSubscribersResponse object representing the retrieved subscribers.
	 * @throws {Error} - If the request to get the subscribers fails.
	 */
	async getSubscribers(
		page: number,
		per_page: number,
		query: string
	): Promise<GetSubscribersResponse> {
		const url = this.constructUrl('/api/subscribers', { page, per_page, query });

		const response = await fetch(url, {
			headers: this.getHeaders()
		});

		if (!response.ok) {
			console.log(response);
			throw new Error(`Failed to get subscribers: ${response.statusText}`);
		}

		return response.json();
	}

	/**
	 * Creates a new subscriber.
	 *
	 * @param {CreateSubscriberRequest} options - The options for creating the subscriber.
	 * @returns {Promise<CreateSubscriberResponse>} - A promise that resolves with the created subscriber.
	 * @throws {Error} - If the request to create the subscriber fails.
	 */
	async createSubscriber({
		email,
		name,
		status = 'enabled',
		lists,
		list_uuids,
		preconfirm_subscriptions,
		attribs
	}: CreateSubscriberRequest): Promise<CreateSubscriberResponse> {
		const url = this.constructUrl('/api/subscribers');
		const body = JSON.stringify({
			email,
			name,
			status,
			lists,
			list_uuids,
			preconfirm_subscriptions,
			attribs
		});

		console.log(body);

		const response = await fetch(url, {
			method: 'POST',
			headers: this.getHeaders(),
			body
		});

		if (!response.ok) {
			console.log(response);
			throw new Error(`Failed to create subscriber: ${response.statusText}`);
		}

		return response.json();
	}

	/**
	 * Retrieves a subscriber with the given ID.
	 *
	 * @param {string} id - The ID of the subscriber to retrieve.
	 * @returns {Promise<GetSubscriberResponse>} - A promise that resolves with the retrieved subscriber.
	 * @throws {Error} - An error if the retrieval operation fails.
	 */

	async getSubscriber(id: string): Promise<GetSubscribersResponse> {
		const url = this.constructUrl(`/api/subscribers/${id}`);
		const response = await fetch(url, {
			headers: this.getHeaders()
		});

		if (!response.ok) {
			console.log(response);
			throw new Error(`Failed to get subscriber: ${response.statusText}`);
		}

		return response.json();
	}

	/**
	 * Updates a subscriber with the given ID.
	 *
	 * @param {string} id - The ID of the subscriber to update.
	 * @param {UpdateSubscriberRequest} options - The options for updating the subscriber.
	 * @returns {Promise<UpdateSubscriberResponse>} - A promise that resolves with the updated subscriber.
	 * @throws {Error} - An error if the update operation fails.
	 */
	async updateSubscriber(
		id: string,
		options: UpdateSubscriberRequest
	): Promise<UpdateSubscriberResponse> {
		const url = this.constructUrl(`/api/subscribers/${id}`);
		const body = JSON.stringify(options);

		const response = await fetch(url, {
			method: 'PUT',
			headers: this.getHeaders(),
			body
		});

		if (!response.ok) {
			console.log(response);
			throw new Error(`Failed to update subscriber: ${response.statusText}`);
		}

		return response.json();
	}

	/**
	 * Deletes a subscriber with the given ID.
	 *
	 * @param {string} id - The ID of the subscriber to delete.
	 * @returns {Promise<BaseBooleanConfirmation>} - A promise that resolves with the deleted subscriber.
	 * @throws {Error} - An error if the deletion operation fails.
	 */
	async deleteSubscriber(id: string): Promise<BaseBooleanConfirmation> {
		const url = this.constructUrl(`/api/subscribers/${id}`);
		const response = await fetch(url, {
			method: 'DELETE',
			headers: this.getHeaders()
		});

		if (!response.ok) {
			console.log(response);
			throw new Error(`Failed to delete subscriber: ${response.statusText}`);
		}

		return response.json();
	}

	/**
	 * Subscribes a subscriber with the given ID.
	 *
	 * @param {string} id - The ID of the subscriber to subscribe.
	 * @returns {Promise<BaseBooleanConfirmation>} - A promise that resolves with the subscribed subscriber.
	 * @throws {Error} - An error if the subscribe operation fails.
	 */
	async blocklistSubscriber(id: string): Promise<BaseBooleanConfirmation> {
		const url = this.constructUrl(`/api/subscribers/${id}/blocklist`);
		const response = await fetch(url, {
			method: 'PUT',
			headers: this.getHeaders()
		});

		if (!response.ok) {
			console.log(response);
			throw new Error(`Failed to blocklist subscriber: ${response.statusText}`);
		}

		return response.json();
	}

	/**
	 * Bulk adds, removes, or unsubscribes multiple subscribers from multiple lists.
	 *
	 * @param {BulkModifySubscribersListsRequest} data - The data for bulk adding or deleting subscribers from a list.
	 * @returns {Promise<BaseBooleanConfirmation>} - A promise that resolves with the result of the bulk operation.
	 * @throws {Error} - An error if the bulk operation fails.
	 */
	async bulkModifySubscribersLists(
		data: BulkModifySubscribersListsRequest
	): Promise<BaseBooleanConfirmation> {
		const url = this.constructUrl('/api/subscribers/lists');
		const body = JSON.stringify(data);

		const response = await fetch(url, {
			method: 'PUT',
			headers: this.getHeaders(),
			body
		});

		if (!response.ok) {
			console.log(response);
			throw new Error(`Failed to bulk modify subscriber lists: ${response.statusText}`);
		}

		return response.json();
	}

	/**
	 * Bulk adds, removes, or unsubscribes multiple subscribers from a single list.
	 * @param {number} listId - The ID of the list to modify.
	 * @param {BulkModifySubscribersListsRequest} data - The data for bulk adding or deleting subscribers from a list.
	 * @returns {Promise<BaseBooleanConfirmation>} - A promise that resolves with the result of the bulk operation.
	 * @throws {Error} - An error if the bulk operation fails.
	 */
	async bulkModifySubscribersList(
		listId: string,
		data: BulkModifySubscribersListsRequest
	): Promise<BaseBooleanConfirmation> {
		const url = this.constructUrl(`/api/subscribers/list/${listId}`);
		const body = JSON.stringify(data);

		const response = await fetch(url, {
			method: 'PUT',
			headers: this.getHeaders(),
			body
		});

		if (!response.ok) {
			console.log(response);
			throw new Error(`Failed to bulk modify subscriber list: ${response.statusText}`);
		}

		return response.json();
	}

	/**
	 * Retrieves a list of subscribers based on the specified parameters.
	 *
	 * @param {GetListsRequest} params - The parameters to filter the lists: query, status, tags, order_by, order, page, per_page.
	 * @returns {Promise<getListsResponse>} - A promise that resolves to a getListsResponse object representing the retrieved subscribers.
	 * @throws {Error} - If the request to get the subscribers fails.
	 */
	async getLists(params?: GetListsRequest): Promise<GetListsResponse> {
		const { query, status, tags, order_by, order, page, per_page }: GetListsRequest = {};
		params;
		const url = this.constructUrl('/api/lists', {
			query,
			status: status?.join(','),
			tags: tags?.join(','),
			order_by,
			order,
			page,
			per_page
		});

		const response = await fetch(url, {
			headers: this.getHeaders()
		});

		if (!response.ok) {
			console.log(response);
			throw new Error(`Failed to get lists: ${response.statusText}`);
		}

		return response.json();
	}

	/**
	 * Creates a new list.
	 *
	 * @param {CreateListRequest} data - The data for creating the list.
	 * @returns {Promise<CreateListResponse>} - A promise that resolves with the created list.
	 * @throws {Error} - If the request to create the list fails.
	 */
	async createList(data: CreateListRequest): Promise<CreateListResponse> {
		const url = this.constructUrl('/api/lists');
		const body = JSON.stringify(data);

		const response = await fetch(url, {
			method: 'POST',
			headers: this.getHeaders(),
			body
		});

		if (!response.ok) {
			console.log(response);
			throw new Error(`Failed to create list: ${response.statusText}`);
		}

		return response.json();
	}

	/**
	 * Retrieves a list with the given ID.
	 *
	 * @param {string} listId - The ID of the list to retrieve.
	 * @returns {Promise<GetListResponse>} - A promise that resolves with the retrieved list.
	 * @throws {Error} - An error if the retrieval operation fails.
	 */
	async getList(listId: string): Promise<GetListResponse> {
		const url = this.constructUrl(`/api/lists/${listId}`);
		const response = await fetch(url, {
			headers: this.getHeaders()
		});

		if (!response.ok) {
			console.log(response);
			throw new Error(`Failed to get list: ${response.statusText}`);
		}

		return response.json();
	}

	/**
	 * Updates a list with the given ID.
	 *
	 * @param {string} listId - The ID of the list to update.
	 * @param {UpdateListRequest} data - The data for updating the list.
	 * @returns {Promise<UpdateListResponse>} - A promise that resolves with the updated list.
	 * @throws {Error} - An error if the update operation fails.
	 */
	async updateList(listId: string, data: UpdateListRequest): Promise<UpdateListResponse> {
		const url = this.constructUrl(`/api/lists/${listId}`);
		const body = JSON.stringify(data);

		const response = await fetch(url, {
			method: 'PUT',
			headers: this.getHeaders(),
			body
		});

		if (!response.ok) {
			console.log(response);
			throw new Error(`Failed to update list: ${response.statusText}`);
		}

		return response.json();
	}

	/**
	 * Deletes a list with the given ID.
	 *
	 * @param {string} listId - The ID of the list to delete.
	 * @returns {Promise<BaseBooleanConfirmation>} - A promise that resolves with the deleted list.
	 * @throws {Error} - An error if the deletion operation fails.
	 */
	async deleteList(listId: string): Promise<BaseBooleanConfirmation> {
		const url = this.constructUrl(`/api/lists/${listId}`);
		const response = await fetch(url, {
			method: 'DELETE',
			headers: this.getHeaders()
		});

		if (!response.ok) {
			console.log(response);
			throw new Error(`Failed to delete list: ${response.statusText}`);
		}

		return response.json();
	}
}
