interface KaomojiThinkingProps {
  size?: 'sm' | 'md';
  text?: string;
}

export function KaomojiThinking({ size = 'md', text = 'Thinking...' }: KaomojiThinkingProps) {
  const textSize = size === 'sm' ? 'text-sm' : 'text-base';
  const kaomojiSize = size === 'sm' ? 'text-base' : 'text-lg';

  return (
    <div className="flex items-center gap-3">
      <span
        className={`${kaomojiSize} font-mono font-bold animate-kaomoji-shimmer bg-[length:200%_100%] bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-orange-300 to-amber-400 motion-reduce:animate-none motion-reduce:text-amber-400 motion-reduce:bg-none`}
      >
        {'¯\\_(ツ)_/¯'}
      </span>
      <span className={`${textSize} text-terminal-text-muted dark:text-gray-400`}>
        {text}
      </span>
    </div>
  );
}
