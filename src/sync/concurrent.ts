// Default fan-out for feed resolve/fetch/poll. Kept low so all requests (which
// all hit the home instance) stay gentle on it.
export const FEED_CONCURRENCY = 3;

// Run tasks with a fixed concurrency limit.
// Safe in single-threaded JS: the index increment is synchronous.
export async function concurrent(
	tasks: (() => Promise<void>)[],
	limit: number,
): Promise<void> {
	let i = 0;
	const worker = async () => {
		while (i < tasks.length) {
			await tasks[i++]();
		}
	};
	await Promise.all(
		Array.from({ length: Math.min(limit, tasks.length) }, worker),
	);
}
