import { useCallback, useEffect, useState } from "react";
import {
	addSubscription,
	migrateSubscriptions,
	normalizeHandle,
	removeSubscription,
	saveSubscriptions,
} from "../store/subscriptions";

export function useSubscriptions() {
	const [handles, setHandles] = useState<Set<string>>(new Set());
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		// Repairs any handles previously saved in a bad format (e.g. a URL).
		migrateSubscriptions().then((s) => {
			setHandles(s);
			setLoading(false);
		});
	}, []);

	const subscribe = useCallback(async (handle: string) => {
		const updated = await addSubscription(handle);
		setHandles(new Set(updated));
	}, []);

	const unsubscribe = useCallback(async (handle: string) => {
		const updated = await removeSubscription(handle);
		setHandles(new Set(updated));
	}, []);

	const isSubscribed = useCallback(
		(handle: string) => handles.has(normalizeHandle(handle)),
		[handles],
	);

	const replaceAll = useCallback(async (newHandles: Set<string>) => {
		await saveSubscriptions(newHandles);
		setHandles(new Set(newHandles));
	}, []);

	return { handles, loading, subscribe, unsubscribe, isSubscribed, replaceAll };
}
