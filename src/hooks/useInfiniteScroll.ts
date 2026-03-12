import { debounce } from "lodash";
import type { RefObject } from "react";
import { useEffect, useMemo, useRef } from "react";

export function useInfiniteScroll(
	onLoadMore: () => void,
	scrollContainerRef: RefObject<HTMLElement | null>,
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
}
