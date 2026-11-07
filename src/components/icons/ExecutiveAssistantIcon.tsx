interface ExecutiveAssistantIconProps {
  className?: string;
}

const ExecutiveAssistantIcon = ({ className = "w-5 h-5" }: ExecutiveAssistantIconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Person head */}
    <circle cx="12" cy="8" r="4" />
    {/* Shoulders */}
    <path d="M5 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2" />
    {/* AI circuit nodes on head */}
    <circle cx="10.5" cy="7" r="0.5" fill="currentColor" stroke="none" />
    <circle cx="13.5" cy="7" r="0.5" fill="currentColor" stroke="none" />
    <circle cx="12" cy="9.5" r="0.5" fill="currentColor" stroke="none" />
    {/* Circuit lines */}
    <line x1="10.5" y1="7" x2="12" y2="9.5" strokeWidth="0.8" />
    <line x1="13.5" y1="7" x2="12" y2="9.5" strokeWidth="0.8" />
    {/* Small sparkle */}
    <path d="M19 3l0.5 1.5L21 5l-1.5 0.5L19 7l-0.5-1.5L17 5l1.5-0.5z" fill="currentColor" stroke="none" />
  </svg>
);

export default ExecutiveAssistantIcon;
