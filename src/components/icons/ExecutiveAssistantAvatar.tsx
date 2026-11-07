import { cn } from "@/lib/utils";

interface ExecutiveAssistantAvatarProps {
  className?: string;
  size?: number;
}

const ExecutiveAssistantAvatar = ({ className, size = 24 }: ExecutiveAssistantAvatarProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("flex-shrink-0", className)}
  >
    {/* Background circle with gradient */}
    <defs>
      <linearGradient id="ea-bg" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
        <stop stopColor="#CC6633" />
        <stop offset="1" stopColor="#8b5cf6" />
      </linearGradient>
      <linearGradient id="ea-shine" x1="12" y1="8" x2="36" y2="40" gradientUnits="userSpaceOnUse">
        <stop stopColor="white" stopOpacity="0.25" />
        <stop offset="1" stopColor="white" stopOpacity="0" />
      </linearGradient>
    </defs>
    <circle cx="24" cy="24" r="24" fill="url(#ea-bg)" />
    <circle cx="24" cy="24" r="24" fill="url(#ea-shine)" />

    {/* Stylized person silhouette — head */}
    <circle cx="24" cy="16" r="6" fill="white" opacity="0.95" />

    {/* Body / shoulders */}
    <path
      d="M12 38c0-6.627 5.373-12 12-12s12 5.373 12 12"
      fill="white"
      opacity="0.95"
    />

    {/* AI brain circuit lines on the head */}
    <circle cx="22" cy="14.5" r="1" fill="#CC6633" />
    <circle cx="26" cy="14.5" r="1" fill="#CC6633" />
    <circle cx="24" cy="17.5" r="1" fill="#CC6633" />
    <line x1="22" y1="14.5" x2="24" y2="17.5" stroke="#CC6633" strokeWidth="0.7" />
    <line x1="26" y1="14.5" x2="24" y2="17.5" stroke="#CC6633" strokeWidth="0.7" />
    <line x1="22" y1="14.5" x2="26" y2="14.5" stroke="#CC6633" strokeWidth="0.7" />

    {/* Small sparkle accent */}
    <path
      d="M36 10l1 2.5L39.5 14l-2.5 1L36 17.5 35 15l-2.5-1L35 12.5z"
      fill="#fbbf24"
      opacity="0.9"
    />
    <path
      d="M10 12l0.7 1.7 1.8 0.7-1.8 0.7L10 16.8 9.3 15.1 7.5 14.4l1.8-0.7z"
      fill="#fbbf24"
      opacity="0.6"
    />
  </svg>
);

export default ExecutiveAssistantAvatar;
