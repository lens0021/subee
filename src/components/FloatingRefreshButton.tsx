import { faArrowUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { RefObject } from "react";
import { useEffect, useState } from "react";

interface FloatingRefreshButtonProps {
	onRefresh: () => void;
	scrollContainerRef: RefObject<HTMLElement | null>;
}

export function FloatingRefreshButton({
	onRefresh,
	scrollContainerRef,
}: FloatingRefreshButtonProps) {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		const el = scrollContainerRef.current;
		if (!el) return;
		const handleScroll = () => setVisible(el.scrollTop > 200);
		el.addEventListener("scroll", handleScroll, { passive: true });
		return () => el.removeEventListener("scroll", handleScroll);
	}, [scrollContainerRef]);

	if (!visible) return null;

	return (
		<button
			type="button"
			onClick={() => {
				scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
				onRefresh();
			}}
			className="fixed top-16 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium hover:bg-blue-600 transition-colors z-30"
		>
			<FontAwesomeIcon icon={faArrowUp} />
			Refresh
		</button>
	);
}
