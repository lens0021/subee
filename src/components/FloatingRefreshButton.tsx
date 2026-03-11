import { faArrowUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";

interface FloatingRefreshButtonProps {
	onRefresh: () => void;
}

export function FloatingRefreshButton({
	onRefresh,
}: FloatingRefreshButtonProps) {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		const handleScroll = () => setVisible(window.scrollY > 200);
		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	if (!visible) return null;

	return (
		<button
			type="button"
			onClick={() => {
				window.scrollTo({ top: 0, behavior: "smooth" });
				onRefresh();
			}}
			className="fixed top-16 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium hover:bg-blue-600 transition-colors z-30"
		>
			<FontAwesomeIcon icon={faArrowUp} />
			Refresh
		</button>
	);
}
