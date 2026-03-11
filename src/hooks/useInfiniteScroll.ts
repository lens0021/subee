import { debounce } from "lodash";
import { useEffect, useMemo, useRef } from "react";

export function useInfiniteScroll(onLoadMore: () => void, threshold = 300) {
	const onLoadMoreRef = useRef(onLoadMore);
	onLoadMoreRef.current = onLoadMore;

	const debouncedCheck = useMemo(
		() =>
			debounce(() => {
				const scrolledToBottom =
					window.innerHeight + window.scrollY >=
					document.documentElement.scrollHeight - threshold;
				if (scrolledToBottom) onLoadMoreRef.current();
			}, 200),
		[threshold],
	);

	useEffect(() => {
		window.addEventListener("scroll", debouncedCheck, { passive: true });
		return () => {
			window.removeEventListener("scroll", debouncedCheck);
			debouncedCheck.cancel();
		};
	}, [debouncedCheck]);
}
