// Aries AI logo, from the official artwork (Brand Assets / Aries AI logos.svg).
// Brand rules: only Obsidian (#0E0C0F) or Cream (#EDE8E1); dark mark on light
// backgrounds, light mark on dark ones; no outlines, effects, gradients or boxes.
// The mark uses currentColor, so set the colour with text-obsidian / text-cream.

type MarkProps = { className?: string; title?: string };

export const AriesMark = ({ className = 'w-8 h-8', title = 'Aries AI' }: MarkProps) => (
	<svg viewBox="40 160 920 680" className={className} fill="currentColor" role="img" aria-label={title}>
		<title>{title}</title>
		<path d="M514.3,824.6l56.4-79.2c8.7-106.6-18.4-347.1,130.3-435.4c130.6-77.5,202.1-24,251.7,35.6C900.3,128.3,651.1,120.5,549.9,314C480.9,410,522.2,790.4,514.3,824.6z" />
		<path d="M683.2,369.4c219-206.6,461,127.7,13.9,297.5c25.8-33.5,142.6-135.9,131.7-222.3C821.1,369.8,739.1,350,683.2,369.4z" />
		<path d="M485.7,824.6l-56.4-79.2c-8.7-106.6,18.4-347.1-130.3-435.4c-130.6-77.5-202.1-24-251.7,35.6C99.7,128.3,348.9,120.5,450.1,314C519.1,410,477.8,790.4,485.7,824.6z" />
		<path d="M316.8,369.4c-219-206.6-461,127.7-13.9,297.5C277.2,633.4,160.3,531,171.3,444.6C178.9,369.8,260.9,350,316.8,369.4z" />
	</svg>
);

type LogoProps = {
	className?: string;
	markClassName?: string;
	/** "dark" = Obsidian logo (for light backgrounds), "light" = Cream logo (for dark backgrounds). */
	tone?: 'dark' | 'light';
};

/** Mark plus the ARIES AI wordmark in Cormorant Garamond. */
export const AriesLogo = ({ className = '', markClassName = 'w-8 h-7', tone = 'dark' }: LogoProps) => (
	<span className={`inline-flex items-center gap-2.5 ${tone === 'light' ? 'text-cream' : 'text-obsidian'} ${className}`}>
		<AriesMark className={markClassName} />
		<span className="font-display text-xl font-bold tracking-wide leading-none">ARIES AI</span>
	</span>
);

export default AriesLogo;
