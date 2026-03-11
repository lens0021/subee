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

interface PostCardProps {
	status: mastodon.v1.Status;
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

export function PostCard({ status, onSubscribe, isSubscribed }: PostCardProps) {
	const [cwOpen, setCwOpen] = useState(false);
	const actual = status.reblog ?? status;
	const hasCw = !!actual.spoilerText;
	const showContent = !hasCw || cwOpen;

	const createdAt = actual.createdAt ? new Date(actual.createdAt) : new Date();
	const relativeTime = formatDistanceToNow(createdAt, { addSuffix: true });
	const absoluteTime = createdAt.toLocaleString();

	return (
		<article className="border-b border-gray-200 dark:border-gray-700 p-4">
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
				<div className="mt-2 text-sm [&_a]:text-blue-500">
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
					<a
						href={actual.url ?? "#"}
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-1 hover:text-green-500 transition-colors"
					>
						<FontAwesomeIcon icon={faRetweet} />
						{actual.reblogsCount}
					</a>
					<a
						href={actual.url ?? "#"}
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-1 hover:text-red-500 transition-colors"
					>
						<FontAwesomeIcon icon={faHeart} />
						{actual.favouritesCount}
					</a>
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
