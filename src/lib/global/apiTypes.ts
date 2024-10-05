export type ExtractReturnType<T extends (...args: any[]) => Promise<any>> = NonNullable<
	Awaited<ReturnType<T>>['data']
>;
