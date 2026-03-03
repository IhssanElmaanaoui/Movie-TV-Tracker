import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import PropTypes from "prop-types";

/**
 * StartChatButton Component
 * 
 * A reusable button component to initiate a chat with another user.
 * Can be placed on user profiles, follower lists, or anywhere you want
 * to enable users to start a conversation.
 * 
 * Usage:
 * <StartChatButton userId={otherUserId} username={otherUsername} />
 */
export default function StartChatButton({ userId, username, className = "", variant = "primary" }) {
    const navigate = useNavigate();

    const handleStartChat = () => {
        navigate(`/chat?recipientId=${userId}`);
    };

    // Variant styles
    const variants = {
        primary: "bg-purple-600 hover:bg-purple-700 text-white",
        secondary: "bg-gray-700 hover:bg-gray-600 text-white",
        outline: "border-2 border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white",
        ghost: "text-purple-600 hover:bg-purple-600/10"
    };

    return (
        <button
            onClick={handleStartChat}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${variants[variant]} ${className}`}
            title={`Send message to ${username}`}
        >
            <MessageCircle className="w-4 h-4" />
            <span>Message</span>
        </button>
    );
}

StartChatButton.propTypes = {
    userId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    username: PropTypes.string,
    className: PropTypes.string,
    variant: PropTypes.oneOf(['primary', 'secondary', 'outline', 'ghost'])
};
