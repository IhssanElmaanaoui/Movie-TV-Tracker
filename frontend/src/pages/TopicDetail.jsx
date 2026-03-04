import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowLeft, ArrowUp, ArrowDown, MessageCircle, Clock,
    Trash2, ChevronDown, Share2, Bookmark, Minus
} from "lucide-react";
import { userStorage } from "../services/authService";
import communityService from "../services/communityService";

/* ─── helpers ─────────────────────────────────────────────────────────── */

function formatTimeAgo(dateString) {
    if (!dateString) return '';
    const seconds = Math.floor((Date.now() - new Date(dateString)) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return `${Math.floor(seconds / 604800)}w ago`;
}

function Avatar({ user, size = 8 }) {
    const initials = user?.username?.[0]?.toUpperCase() || '?';
    if (user?.profilePictureUrl) {
        return (
            <img
                src={user.profilePictureUrl}
                alt={user.username}
                className={`w-${size} h-${size} rounded-full object-cover flex-shrink-0`}
            />
        );
    }
    return (
        <div className={`w-${size} h-${size} rounded-full bg-purple-700 flex items-center justify-center flex-shrink-0 text-white font-bold text-xs`}>
            {initials}
        </div>
    );
}

/** Build a tree from a flat reply list */
function buildTree(flat) {
    const map = {};
    const roots = [];
    flat.forEach(r => { map[r.id] = { ...r, children: [] }; });
    flat.forEach(r => {
        if (r.parentReply?.id && map[r.parentReply.id]) {
            map[r.parentReply.id].children.push(map[r.id]);
        } else {
            roots.push(map[r.id]);
        }
    });
    return roots;
}

const SORT_OPTIONS = ['New', 'Old', 'Top'];
const INDENT_COLORS = [
    'border-blue-500', 'border-green-500', 'border-yellow-500',
    'border-pink-500', 'border-purple-500', 'border-red-400',
];

/* ─── Comment node ─────────────────────────────────────────────────────── */

function CommentNode({ reply, depth, topicId, opUsername, currentUser, onDelete }) {
    const [collapsed, setCollapsed] = useState(false);
    const [showReplyForm, setShowReplyForm] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [sending, setSending] = useState(false);
    const navigate = useNavigate();

    const isOp = reply.author?.username === opUsername;
    const isOwn = currentUser?.username === reply.author?.username;
    const indentColor = INDENT_COLORS[depth % INDENT_COLORS.length];

    const handleReplySubmit = async (e) => {
        e.preventDefault();
        if (!replyContent.trim()) return;
        setSending(true);
        const content = replyContent.trim();

        const wsSent = communityService.sendReplyWebSocket(topicId, content, reply.id);
        if (wsSent) {
            setReplyContent('');
            setShowReplyForm(false);
        } else {
            const result = await communityService.createReply(topicId, content, reply.id);
            if (result.success) {
                setReplyContent('');
                setShowReplyForm(false);
            }
        }
        setSending(false);
    };

    return (
        <div className={`mt-3 ${depth > 0 ? 'ml-4' : ''}`}>
            <div className="flex gap-2">
                {/* Collapse gutter */}
                <div className="flex flex-col items-center flex-shrink-0 w-5">
                    <Avatar user={reply.author} size={6} />
                    {!collapsed && (reply.children?.length > 0 || true) && (
                        <button
                            onClick={() => setCollapsed(true)}
                            className={`mt-1 w-0.5 flex-1 min-h-4 border-l-2 ${indentColor} hover:opacity-40 transition-opacity cursor-pointer`}
                            title="Collapse thread"
                        />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    {/* Header row */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span
                            className={`text-sm font-semibold text-white ${reply.author?.id !== currentUser?.id ? 'hover:underline cursor-pointer' : ''}`}
                            onClick={() => { if (reply.author?.id !== currentUser?.id) navigate(`/user/${reply.author?.id}`); }}
                        >
                            {reply.author?.username}
                        </span>
                        {isOp && (
                            <span className="text-xs bg-purple-600/30 text-purple-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                                OP
                            </span>
                        )}
                        <span className="text-xs text-gray-500">{formatTimeAgo(reply.createdAt)}</span>
                        {collapsed && (
                            <button
                                onClick={() => setCollapsed(false)}
                                className="text-xs text-gray-500 hover:text-white flex items-center gap-1 ml-1"
                            >
                                <ChevronDown className="w-3 h-3" />
                                {reply.children?.length
                                    ? `${1 + reply.children.length} hidden`
                                    : 'expand'}
                            </button>
                        )}
                    </div>

                    {!collapsed && (
                        <>
                            {/* Content */}
                            <p className="text-gray-200 text-sm whitespace-pre-wrap leading-relaxed mb-2">
                                {reply.content}
                            </p>

                            {/* Action row */}
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                                {currentUser ? (
                                    <button
                                        onClick={() => { setShowReplyForm(v => !v); setReplyContent(''); }}
                                        className="flex items-center gap-1 hover:text-white transition-colors font-bold uppercase tracking-wide"
                                    >
                                        <MessageCircle className="w-3.5 h-3.5" />
                                        Reply
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => navigate('/login')}
                                        className="flex items-center gap-1 hover:text-white transition-colors font-bold uppercase tracking-wide"
                                    >
                                        <MessageCircle className="w-3.5 h-3.5" />
                                        Reply
                                    </button>
                                )}

                                <button
                                    onClick={() => setCollapsed(true)}
                                    className="flex items-center gap-1 hover:text-white transition-colors font-bold uppercase tracking-wide"
                                >
                                    <Minus className="w-3.5 h-3.5" />
                                    Collapse
                                </button>

                                {isOwn && (
                                    <button
                                        onClick={() => onDelete(reply.id)}
                                        className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors font-bold uppercase tracking-wide"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Delete
                                    </button>
                                )}
                            </div>

                            {/* Inline reply form */}
                            {showReplyForm && currentUser && (
                                <form onSubmit={handleReplySubmit} className="mt-3">
                                    <div className="bg-gray-800/60 border border-gray-700 rounded-lg overflow-hidden">
                                        <div className="px-3 py-1.5 border-b border-gray-700 flex items-center gap-2 text-xs text-gray-400">
                                            <span>Replying to</span>
                                            <span className="text-white font-medium">u/{reply.author?.username}</span>
                                        </div>
                                        <textarea
                                            autoFocus
                                            value={replyContent}
                                            onChange={e => setReplyContent(e.target.value)}
                                            placeholder="What are your thoughts?"
                                            rows={3}
                                            className="w-full bg-transparent text-white text-sm px-3 py-2 focus:outline-none resize-none"
                                        />
                                        <div className="flex justify-end gap-2 px-3 py-2 border-t border-gray-700">
                                            <button
                                                type="button"
                                                onClick={() => setShowReplyForm(false)}
                                                className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded font-bold uppercase"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={sending || !replyContent.trim()}
                                                className="text-xs bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white px-4 py-1.5 rounded font-bold uppercase transition-colors"
                                            >
                                                {sending ? 'Sending…' : 'Reply'}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            )}

                            {/* Children */}
                            {reply.children?.map(child => (
                                <CommentNode
                                    key={child.id}
                                    reply={child}
                                    depth={depth + 1}
                                    topicId={topicId}
                                    opUsername={opUsername}
                                    currentUser={currentUser}
                                    onDelete={onDelete}
                                />
                            ))}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ─── Main page ─────────────────────────────────────────────────────────── */

export default function TopicDetail() {
    const { topicId } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [topic, setTopic] = useState(null);
    const [replies, setReplies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [commentText, setCommentText] = useState('');
    const [sending, setSending] = useState(false);
    const [sort, setSort] = useState('New');
    const [saved, setSaved] = useState(false);
    const [copied, setCopied] = useState(false);
    const commentBoxRef = useRef(null);

    /* websocket + polling */
    useEffect(() => {
        const currentUser = userStorage.getUser();
        setUser(currentUser);
        fetchTopic();
        fetchReplies();

        const addNewReply = (newReply) => {
            setReplies(prev => prev.some(r => r.id === newReply.id) ? prev : [...prev, newReply]);
            setTopic(prev => prev ? { ...prev, replyCount: (prev.replyCount || 0) + 1 } : null);
        };

        communityService.connectWebSocket(null, null, null, () => {
            communityService.subscribeToTopic(
                topicId,
                addNewReply,
                (upvoteCount) => setTopic(prev => prev ? { ...prev, upvoteCount } : null)
            );
        });

        const pollInterval = setInterval(async () => {
            const result = await communityService.getReplies(topicId, 0, 100);
            if (result.success) {
                const fetched = result.data.content || result.data;
                setReplies(prev => {
                    const existingIds = new Set(prev.map(r => r.id));
                    const incoming = fetched.filter(r => !existingIds.has(r.id));
                    if (!incoming.length) return prev;
                    setTopic(p => p ? { ...p, replyCount: (p.replyCount || 0) + incoming.length } : p);
                    return [...prev, ...incoming];
                });
            }
        }, 5000);

        return () => {
            clearInterval(pollInterval);
            communityService.unsubscribeFromTopic();
        };
    }, [topicId]);

    const fetchTopic = async () => {
        const result = await communityService.getTopic(topicId);
        if (result.success) setTopic(result.data);
        setLoading(false);
    };

    const fetchReplies = async () => {
        const result = await communityService.getReplies(topicId, 0, 100);
        if (result.success) setReplies(result.data.content || result.data);
    };

    const handleUpvote = async () => {
        if (!user) { navigate('/login'); return; }
        const result = await communityService.toggleUpvote(topicId);
        if (result.success) {
            setTopic(prev => ({
                ...prev,
                hasUpvoted: result.data.hasUpvoted,
                upvoteCount: result.data.hasUpvoted ? prev.upvoteCount + 1 : prev.upvoteCount - 1,
            }));
        }
    };

    const handlePostComment = async (e) => {
        e.preventDefault();
        if (!user) { navigate('/login'); return; }
        if (!commentText.trim()) return;
        setSending(true);
        const content = commentText.trim();

        const wsSent = communityService.sendReplyWebSocket(topicId, content, null);
        if (wsSent) {
            setCommentText('');
        } else {
            const result = await communityService.createReply(topicId, content, null);
            if (result.success) {
                setReplies(prev => [...prev, result.data]);
                setTopic(prev => prev ? { ...prev, replyCount: (prev.replyCount || 0) + 1 } : null);
                setCommentText('');
            }
        }
        setSending(false);
    };

    const handleDelete = async (replyId) => {
        if (!window.confirm('Delete this comment?')) return;
        const result = await communityService.deleteReply(replyId);
        if (result.success) {
            setReplies(prev => prev.filter(r => r.id !== replyId));
            setTopic(prev => prev ? { ...prev, replyCount: Math.max(0, (prev.replyCount || 1) - 1) } : null);
        }
    };

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    /* sort + tree */
    const sortedReplies = [...replies].sort((a, b) => {
        if (sort === 'New') return new Date(b.createdAt) - new Date(a.createdAt);
        if (sort === 'Old') return new Date(a.createdAt) - new Date(b.createdAt);
        return 0;
    });
    const tree = buildTree(sortedReplies);

    /* loading / not found */
    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center pt-20">
            <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-gray-400 text-sm">Loading…</span>
            </div>
        </div>
    );

    if (!topic) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center pt-20">
            <div className="text-center">
                <p className="text-2xl font-bold text-white mb-2">Post not found</p>
                <button onClick={() => navigate('/community')} className="text-purple-400 hover:underline text-sm">
                    ← Back to Community
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 pt-20 pb-16">
            <div className="max-w-3xl mx-auto px-3 sm:px-4">

                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-3 pt-4">
                    <button onClick={() => navigate('/community')} className="flex items-center gap-1 hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        Community
                    </button>
                    <span>/</span>
                    <span className="text-purple-400 font-medium">{topic.categoryName}</span>
                </div>

                {/* ── POST CARD ─────────────────────────────────────────── */}
                <div className="bg-[#1a1a1b] border border-[#343536] rounded-md overflow-hidden mb-4">
                    <div className="flex">
                        {/* Vote column */}
                        <div className="w-10 flex-shrink-0 bg-[#161617] flex flex-col items-center py-3 gap-1">
                            <button
                                onClick={handleUpvote}
                                disabled={!user}
                                className={`p-1 rounded transition-colors ${topic.hasUpvoted ? 'text-purple-500' : 'text-gray-500 hover:text-purple-400'}`}
                            >
                                <ArrowUp className="w-5 h-5" />
                            </button>
                            <span className={`text-xs font-bold ${topic.hasUpvoted ? 'text-purple-500' : 'text-gray-300'}`}>
                                {topic.upvoteCount ?? 0}
                            </span>
                            <button disabled className="text-gray-700 p-1 cursor-not-allowed">
                                <ArrowDown className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content column */}
                        <div className="flex-1 min-w-0 p-3">
                            {/* Meta */}
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2 flex-wrap">
                                <span className="bg-purple-700/30 text-purple-300 px-2 py-0.5 rounded-full font-medium text-xs">
                                    {topic.categoryName}
                                </span>
                                <span>•</span>
                                <span>Posted by</span>
                                <span
                                    className={`font-medium text-gray-300 ${topic.author?.id !== user?.id ? 'hover:underline cursor-pointer' : ''}`}
                                    onClick={() => { if (topic.author?.id !== user?.id) navigate(`/user/${topic.author?.id}`); }}
                                >
                                    u/{topic.author?.username}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatTimeAgo(topic.createdAt)}
                                </span>
                                {topic.isPinned && (
                                    <span className="bg-green-700/30 text-green-400 px-2 py-0.5 rounded-full font-medium text-xs ml-1">
                                        📌 Pinned
                                    </span>
                                )}
                                {topic.isLocked && (
                                    <span className="bg-yellow-700/30 text-yellow-400 px-2 py-0.5 rounded-full font-medium text-xs ml-1">
                                        🔒 Locked
                                    </span>
                                )}
                            </div>

                            {/* Title */}
                            <h1 className="text-lg sm:text-xl font-semibold text-white leading-snug mb-3">
                                {topic.title}
                            </h1>

                            {/* Body */}
                            <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap mb-4">
                                {topic.content}
                            </div>

                            {/* Action bar */}
                            <div className="flex items-center gap-1 flex-wrap">
                                <button
                                    onClick={() => !topic.isLocked && commentBoxRef.current?.focus()}
                                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:bg-gray-700/50 hover:text-white px-2.5 py-1.5 rounded transition-colors font-bold uppercase tracking-wide"
                                >
                                    <MessageCircle className="w-4 h-4" />
                                    {topic.replyCount ?? 0} {(topic.replyCount ?? 0) === 1 ? 'Comment' : 'Comments'}
                                </button>

                                <button
                                    onClick={handleShare}
                                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:bg-gray-700/50 hover:text-white px-2.5 py-1.5 rounded transition-colors font-bold uppercase tracking-wide"
                                >
                                    <Share2 className="w-4 h-4" />
                                    {copied ? 'Copied!' : 'Share'}
                                </button>

                                <button
                                    onClick={() => setSaved(v => !v)}
                                    className={`flex items-center gap-1.5 text-xs hover:bg-gray-700/50 px-2.5 py-1.5 rounded transition-colors font-bold uppercase tracking-wide ${saved ? 'text-purple-400' : 'text-gray-400 hover:text-white'}`}
                                >
                                    <Bookmark className="w-4 h-4" fill={saved ? 'currentColor' : 'none'} />
                                    {saved ? 'Saved' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── COMMENT BOX ───────────────────────────────────────── */}
                {!topic.isLocked ? (
                    <div className="bg-[#1a1a1b] border border-[#343536] rounded-md p-3 mb-4">
                        {user ? (
                            <>
                                <p className="text-xs text-gray-500 mb-2">
                                    Comment as <span className="text-purple-400 font-medium">u/{user.username}</span>
                                </p>
                                <form onSubmit={handlePostComment}>
                                    <textarea
                                        ref={commentBoxRef}
                                        value={commentText}
                                        onChange={e => setCommentText(e.target.value)}
                                        placeholder="What are your thoughts?"
                                        rows={4}
                                        className="w-full bg-[#272729] border border-[#343536] focus:border-purple-500 text-white text-sm rounded px-3 py-2 focus:outline-none resize-none transition-colors mb-2"
                                    />
                                    <div className="flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={sending || !commentText.trim()}
                                            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-bold uppercase tracking-wide px-5 py-2 rounded-full transition-colors"
                                        >
                                            {sending ? 'Posting…' : 'Comment'}
                                        </button>
                                    </div>
                                </form>
                            </>
                        ) : (
                            <div className="flex items-center justify-between flex-wrap gap-3">
                                <p className="text-sm text-gray-400">Log in or sign up to leave a comment</p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => navigate('/login')}
                                        className="border border-gray-500 text-white text-xs font-bold uppercase px-4 py-1.5 rounded-full hover:border-white transition-colors"
                                    >
                                        Log In
                                    </button>
                                    <button
                                        onClick={() => navigate('/signup')}
                                        className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase px-4 py-1.5 rounded-full transition-colors"
                                    >
                                        Sign Up
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-md p-3 mb-4 text-center">
                        <span className="text-yellow-400 text-sm">🔒 This thread is locked. New comments cannot be posted.</span>
                    </div>
                )}

                {/* ── COMMENTS ─────────────────────────────────────────── */}
                <div className="bg-[#1a1a1b] border border-[#343536] rounded-md px-3 pt-3 pb-6">
                    {/* Sort bar */}
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#343536]">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Sort by</span>
                        <div className="flex gap-1">
                            {SORT_OPTIONS.map(opt => (
                                <button
                                    key={opt}
                                    onClick={() => setSort(opt)}
                                    className={`text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full transition-colors ${sort === opt
                                        ? 'bg-purple-600 text-white'
                                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                        <span className="ml-auto text-xs text-gray-600">
                            {replies.length} {replies.length === 1 ? 'comment' : 'comments'}
                        </span>
                    </div>

                    {tree.length === 0 ? (
                        <div className="py-12 text-center">
                            <MessageCircle className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                            <p className="text-gray-500 text-sm">No comments yet.</p>
                            <p className="text-gray-600 text-xs mt-1">Be the first to share what you think!</p>
                        </div>
                    ) : (
                        <div className="space-y-1 divide-y divide-[#343536]">
                            {tree.map(root => (
                                <div key={root.id} className="pt-3 first:pt-0">
                                    <CommentNode
                                        reply={root}
                                        depth={0}
                                        topicId={topicId}
                                        opUsername={topic.author?.username}
                                        currentUser={user}
                                        onDelete={handleDelete}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
