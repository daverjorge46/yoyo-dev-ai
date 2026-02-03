import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare,
  Mail,
  Phone,
  Slack,
  Send,
  Search,
  ChevronRight,
  Check,
  CheckCheck,
  Sparkles,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { SearchInput } from '../components/common/SearchInput';
import { EmptyState } from '../components/common/EmptyState';
import { PageLoader } from '../components/common/LoadingSpinner';
import type { Channel, Message } from '../types';

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  sms: Phone,
  whatsapp: MessageSquare,
  email: Mail,
  slack: Slack,
  teams: MessageSquare,
};

const CHANNEL_COLORS: Record<string, string> = {
  sms: 'text-success-light',
  whatsapp: 'text-success',
  email: 'text-info-light',
  slack: 'text-accent-400',
  teams: 'text-primary-400',
};

// Channel list item
function ChannelListItem({
  channel,
  isSelected,
  onClick,
}: {
  channel: Channel;
  isSelected: boolean;
  onClick: () => void;
}) {
  const Icon = CHANNEL_ICONS[channel.type] || MessageSquare;
  const color = CHANNEL_COLORS[channel.type] || 'text-terminal-text-secondary';

  return (
    <button
      className={`w-full flex items-center gap-3 p-3 rounded-md transition-colors ${
        isSelected
          ? 'bg-primary-500/10 border-l-2 border-primary-500'
          : 'hover:bg-terminal-elevated'
      }`}
      onClick={onClick}
    >
      <div className={`p-2 rounded-md bg-terminal-elevated ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-medium text-terminal-text truncate">{channel.name}</p>
        <p className="text-xs text-terminal-text-muted capitalize">{channel.type}</p>
      </div>
      {channel.unreadCount > 0 && (
        <Badge variant="primary">{channel.unreadCount}</Badge>
      )}
      {!channel.connected && (
        <Badge variant="muted">Disconnected</Badge>
      )}
    </button>
  );
}

// Message item
function MessageItem({ message, isOwn }: { message: Message; isOwn: boolean }) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] p-3 rounded-lg ${
          isOwn
            ? 'bg-primary-500/20 text-terminal-text'
            : 'bg-terminal-elevated text-terminal-text'
        }`}
      >
        {!isOwn && (
          <p className="text-xs font-medium text-primary-400 mb-1">{message.from}</p>
        )}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <div className="flex items-center justify-end gap-1 mt-1">
          <span className="text-xs text-terminal-text-muted">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {isOwn && (
            message.read ? (
              <CheckCheck className="w-3 h-3 text-info-light" />
            ) : (
              <Check className="w-3 h-3 text-terminal-text-muted" />
            )
          )}
        </div>
      </div>
    </div>
  );
}

// Conversation view
function ConversationView({
  channel,
  messages,
  onSend,
  onAiAssist,
}: {
  channel: Channel;
  messages: Message[];
  onSend: (content: string) => void;
  onAiAssist: () => void;
}) {
  const [input, setInput] = useState('');
  const Icon = CHANNEL_ICONS[channel.type] || MessageSquare;
  const color = CHANNEL_COLORS[channel.type] || 'text-terminal-text-secondary';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSend(input.trim());
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-terminal-border">
        <div className={`p-2 rounded-md bg-terminal-elevated ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-medium text-terminal-text">{channel.name}</h3>
          <p className="text-xs text-terminal-text-muted capitalize">{channel.type}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-terminal-text-muted text-sm">
            No messages yet
          </div>
        ) : (
          messages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              isOwn={msg.from === 'me' || msg.from === 'You'}
            />
          ))
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-terminal-border">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onAiAssist}>
            <Sparkles className="w-4 h-4" />
          </Button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 input"
          />
          <Button type="submit" disabled={!input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function Messages() {
  const queryClient = useQueryClient();
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch channels
  const { data: channels = [], isLoading: loadingChannels } = useQuery<Channel[]>({
    queryKey: ['messages', 'channels'],
    queryFn: async () => {
      const res = await fetch('/api/messages/channels');
      if (!res.ok) throw new Error('Failed to fetch channels');
      const data = await res.json();
      return data.channels || [];
    },
  });

  // Fetch messages for selected channel
  const { data: messages = [], isLoading: loadingMessages } = useQuery<Message[]>({
    queryKey: ['messages', selectedChannel?.id],
    queryFn: async () => {
      if (!selectedChannel) return [];
      const res = await fetch(`/api/messages/${selectedChannel.id}`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      const data = await res.json();
      return data.messages || [];
    },
    enabled: !!selectedChannel,
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async ({ channelId, content }: { channelId: string; content: string }) => {
      const res = await fetch(`/api/messages/${channelId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error('Failed to send message');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedChannel?.id] });
    },
  });

  // Filter channels
  const filteredChannels = channels.filter(
    (c) => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUnread = channels.reduce((acc, c) => acc + c.unreadCount, 0);

  if (loadingChannels) {
    return <PageLoader />;
  }

  return (
    <div className="flex h-full">
      {/* Sidebar - Channel list */}
      <div className="w-80 border-r border-terminal-border flex flex-col">
        <div className="p-4 border-b border-terminal-border">
          <h2 className="text-lg font-semibold text-terminal-text mb-3">Messages</h2>
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search channels..."
          />
          {totalUnread > 0 && (
            <p className="text-xs text-terminal-text-muted mt-2">
              {totalUnread} unread messages
            </p>
          )}
        </div>

        <div className="flex-1 overflow-auto p-2 space-y-1">
          {filteredChannels.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-terminal-text-muted text-sm">
              No channels found
            </div>
          ) : (
            filteredChannels.map((channel) => (
              <ChannelListItem
                key={channel.id}
                channel={channel}
                isSelected={selectedChannel?.id === channel.id}
                onClick={() => setSelectedChannel(channel)}
              />
            ))
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {selectedChannel ? (
          <ConversationView
            channel={selectedChannel}
            messages={messages}
            onSend={(content) =>
              sendMessage.mutate({ channelId: selectedChannel.id, content })
            }
            onAiAssist={() => {
              // Navigate to chat with channel context
              window.location.href = `/chat?channel=${selectedChannel.id}`;
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <EmptyState
              icon={MessageSquare}
              title="Select a channel"
              description="Choose a channel from the sidebar to view messages."
            />
          </div>
        )}
      </div>
    </div>
  );
}
