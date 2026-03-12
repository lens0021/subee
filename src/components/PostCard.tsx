import {
	faBookmark,
	faComment,
	faHeart,
	faRetweet,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { formatDistanceToNow } from "date-fns";
import parse from "html-react-parser";
import type { mastodon } from "masto";
import { useState } from "react";
import {
	favouriteStatus,
	reblogStatus,
	unfavouriteStatus,
	unreblogStatus,
} from "../mastodon";

interface PostCardProps {
	status: mastodon.v1.Status;
	instanceUrl: string;
	accessToken: string;
	onSubscribe: (handle: string) => void;
	isSubscribed: (handle: string) => boolean;
}

function formatHandle(account: mastodon.v1.Account): string {
	const domain = account.url.match(/https?:\/\/([^/]+)/)?.[1] ?? "";
	return `@${account.acct.includes("@") ? account.acct : `${account.acct}@${domain}`}`;
}

function MediaAttachments({
	attachments,
}: { attachments: mastodon.v1.MediaAttachment[] }) {
	if (attachments.length === 0) return null;

	const images = attachments.filter(
		(a) => a.type === "image" || a.type === "gifv",
	);

	return (
		<div
			className={`grid gap-1 mt-2 ${images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}
		>
			{attachments.map((attachment) => {
				if (attachment.type === "image" || attachment.type === "gifv") {
					return (
						<a
							key={attachment.id}
							href={attachment.url ?? "#"}
							target="_blank"
							rel="noopener noreferrer"
						>
							<img
								src={attachment.previewUrl ?? attachment.url ?? ""}
								alt={attachment.description ?? ""}
								loading="lazy"
								className="rounded w-full object-cover max-h-64"
							/>
						</a>
					);
				}
				if (attachment.type === "video" || attachment.type === "audio") {
					return (
						<video
							key={attachment.id}
							src={attachment.url ?? ""}
							controls
							className="rounded w-full max-h-64"
						/>
					);
				}
				return null;
			})}
		</div>
	);
}

function CardPreview({ card }: { card: mastodon.v1.PreviewCard | null }) {
	if (!card || !card.url) return null;

	return (
		<a
			href={card.url}
			target="_blank"
			rel="noopener noreferrer"
			className="block mt-2 border rounded overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
		>
			{card.image && (
				<img
					src={card.image}
					alt={card.title ?? ""}
					loading="lazy"
					className="w-full object-cover max-h-40"
				/>
			)}
			<div className="p-2">
				<div className="font-medium text-sm line-clamp-2">{card.title}</div>
				{card.description && (
					<div className="text-xs text-gray-500 mt-1 line-clamp-2">
						{card.description}
					</div>
				)}
				<div className="text-xs text-blue-500 mt-1 truncate">{card.url}</div>
			</div>
		</a>
	);
}

function AccountInfo({
	account,
	onSubscribe,
	isSubscribed,
}: {
	account: mastodon.v1.Account;
	onSubscribe: (handle: string) => void;
	isSubscribed: (handle: string) => boolean;
}) {
	const handle = formatHandle(account);
	const subscribed = isSubscribed(handle);

	return (
		<div className="flex items-center gap-2 min-w-0">
			<a href={account.url} target="_blank" rel="noopener noreferrer">
				<img
					src={account.avatar}
					alt={account.displayName}
					loading="lazy"
					className="w-10 h-10 rounded-full flex-shrink-0"
				/>
			</a>
			<div className="min-w-0 flex-1">
				<a
					href={account.url}
					target="_blank"
					rel="noopener noreferrer"
					className="font-semibold text-sm block truncate hover:underline"
				>
					{parse(account.displayName || account.acct)}
				</a>
				<div className="text-xs text-gray-500 flex items-center gap-2">
					<a
						href={account.url}
						target="_blank"
						rel="noopener noreferrer"
						className="hover:underline truncate"
					>
						{handle}
					</a>
					<span className="flex-shrink-0">
						{Number(account.followersCount ?? 0).toLocaleString()} followers
					</span>
				</div>
			</div>
			<button
				type="button"
				onClick={() => onSubscribe(handle)}
				className={`flex-shrink-0 text-xs px-2 py-1 rounded border transition-colors ${
					subscribed
						? "bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-300"
						: "border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
				}`}
			>
				{subscribed ? "Subscribed" : "+ Subscribe"}
			</button>
		</div>
	);
}

export function PostCard({
	status,
	instanceUrl,
	accessToken,
	onSubscribe,
	isSubscribed,
}: PostCardProps) {
	const [cwOpen, setCwOpen] = useState(false);
	const actual = status.reblog ?? status;
	const hasCw = !!actual.spoilerText;
	const showContent = !hasCw || cwOpen;

	const [reblogged, setReblogged] = useState(actual.reblogged ?? false);
	const [favourited, setFavourited] = useState(actual.favourited ?? false);
	const [reblogsCount, setReblogsCount] = useState(actual.reblogsCount ?? 0);
	const [favouritesCount, setFavouritesCount] = useState(
		actual.favouritesCount ?? 0,
	);
	const [reblogging, setReblogging] = useState(false);
	const [favouriting, setFavouring] = useState(false);

	const createdAt = actual.createdAt ? new Date(actual.createdAt) : new Date();
	const relativeTime = formatDistanceToNow(createdAt, { addSuffix: true });
	const absoluteTime = createdAt.toLocaleString();

	const handleReblog = async () => {
		if (reblogging || !actual.id) return;
		setReblogging(true);
		const wasReblogged = reblogged;
		setReblogged(!wasReblogged);
		setReblogsCount((c) => c + (wasReblogged ? -1 : 1));
		try {
			if (wasReblogged) {
				await unreblogStatus(instanceUrl, actual.id, accessToken);
			} else {
				await reblogStatus(instanceUrl, actual.id, accessToken);
			}
		} catch {
			// revert on failure
			setReblogged(wasReblogged);
			setReblogsCount((c) => c + (wasReblogged ? 1 : -1));
		} finally {
			setReblogging(false);
		}
	};

	const handleFavourite = async () => {
		if (favouriting || !actual.id) return;
		setFavouring(true);
		const wasFavourited = favourited;
		setFavourited(!wasFavourited);
		setFavouritesCount((c) => c + (wasFavourited ? -1 : 1));
		try {
			if (wasFavourited) {
				await unfavouriteStatus(instanceUrl, actual.id, accessToken);
			} else {
				await favouriteStatus(instanceUrl, actual.id, accessToken);
			}
		} catch {
			// revert on failure
			setFavourited(wasFavourited);
			setFavouritesCount((c) => c + (wasFavourited ? 1 : -1));
		} finally {
			setFavouring(false);
		}
	};

	return (
		<article className="border-b border-gray-200 dark:border-gray-700 p-4 overflow-x-hidden">
			{/* Reblog indicator */}
			{status.reblog && (
				<div className="text-xs text-gray-400 mb-2 flex items-center gap-1">
					<FontAwesomeIcon icon={faRetweet} className="text-green-500" />
					<span>
						{parse(status.account.displayName || status.account.acct)} boosted
					</span>
				</div>
			)}

			{/* Author */}
			<AccountInfo
				account={actual.account}
				onSubscribe={onSubscribe}
				isSubscribed={isSubscribed}
			/>

			{/* Reply indicator */}
			{actual.inReplyToId && (
				<div className="text-xs text-gray-400 mt-1">↩ In reply to a post</div>
			)}

			{/* Content warning */}
			{hasCw && (
				<div className="mt-2">
					<div className="text-sm font-medium text-orange-600 dark:text-orange-400">
						CW: {actual.spoilerText}
					</div>
					<button
						type="button"
						onClick={() => setCwOpen((v) => !v)}
						className="text-xs text-blue-500 mt-1"
					>
						{cwOpen ? "Hide" : "Show content"}
					</button>
				</div>
			)}

			{/* Post content */}
			{showContent && (
				<div className="mt-2 text-sm [&_a]:text-blue-500 break-words">
					{parse(actual.content ?? "")}
				</div>
			)}

			{/* Media */}
			{showContent && (actual.mediaAttachments ?? []).length > 0 && (
				<MediaAttachments attachments={actual.mediaAttachments ?? []} />
			)}

			{/* URL preview card */}
			{showContent && actual.card && <CardPreview card={actual.card} />}

			{/* Footer */}
			<div className="flex items-center justify-between mt-3 text-gray-400 text-xs">
				<div className="flex items-center gap-4">
					<span className="flex items-center gap-1">
						<FontAwesomeIcon icon={faComment} />
						{actual.repliesCount}
					</span>
					<button
						type="button"
						onClick={handleReblog}
						disabled={reblogging}
						className={`flex items-center gap-1 transition-colors disabled:opacity-50 ${
							reblogged ? "text-green-500" : "hover:text-green-500"
						}`}
					>
						<FontAwesomeIcon icon={faRetweet} />
						{reblogsCount}
					</button>
					<button
						type="button"
						onClick={handleFavourite}
						disabled={favouriting}
						className={`flex items-center gap-1 transition-colors disabled:opacity-50 ${
							favourited ? "text-red-500" : "hover:text-red-500"
						}`}
					>
						<FontAwesomeIcon icon={faHeart} />
						{favouritesCount}
					</button>
					<a
						href={actual.url ?? "#"}
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-1 hover:text-blue-500 transition-colors"
					>
						<FontAwesomeIcon icon={faBookmark} />
					</a>
				</div>
				<a
					href={actual.url ?? "#"}
					target="_blank"
					rel="noopener noreferrer"
					title={absoluteTime}
					className="hover:underline"
				>
					{relativeTime}
				</a>
			</div>
		</article>
	);
}
