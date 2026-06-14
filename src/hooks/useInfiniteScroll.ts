import { debounce } from "lodash";
import type { RefObject } from "react";
import { useEffect, useMemo, useRef } from "react";

export function useInfiniteScroll(
	onLoadMore: () => void,
	scrollContainerRef: RefObject<HTMLElement | null>,
	contentLength?: number,
	threshold = 300,
) {
	const onLoadMoreRef = useRef(onLoadMore);
	onLoadMoreRef.current = onLoadMore;

	const debouncedCheck = useMemo(
		() =>
			debounce(() => {
				const el = scrollContainerRef.current;
				if (!el) return;
				if (el.scrollTop + el.clientHeight >= el.scrollHeight - threshold) {
					onLoadMoreRef.current();
				}
			}, 200),
		[scrollContainerRef, threshold],
	);

	useEffect(() => {
		const el = scrollContainerRef.current;
		if (!el) return;
		el.addEventListener("scroll", debouncedCheck, { passive: true });
		return () => {
			el.removeEventListener("scroll", debouncedCheck);
			debouncedCheck.cancel();
		};
	}, [debouncedCheck, scrollContainerRef]);

	// If the content doesn't fill the viewport there is no scroll event to drive
	// pagination (e.g. most of the first page hidden by "Exclude subscribed").
	// Pull the next page until the container is scrollable or the source stops
	// (onLoadMore is guarded by the caller's loading/hasMore checks). contentLength
	// is the re-run trigger even though it isn't read in the body.
	// biome-ignore lint/correctness/useExhaustiveDependencies: contentLength drives the re-check
	useEffect(() => {
		const el = scrollContainerRef.current;
		if (!el) return;
		if (el.scrollHeight <= el.clientHeight + threshold) onLoadMoreRef.current();
	}, [contentLength, scrollContainerRef, threshold]);
}
