import { useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { Play, Star, Pause, Volume2, VolumeX } from 'lucide-react';
import { BRAND } from "@/brand";

/* ─────────────────────────────────────────────────────────────────────────
   EDIT THIS ARRAY to add, remove, or update testimonials.
   Each item needs:
     - src:     path or URL to the video file
     - poster:  thumbnail image shown before play (optional, leave "" to skip)
     - name:    reviewer full name
     - role:    job title / company
     - rating:  1–5 stars
     - quote:   short pull-quote shown below the video
───────────────────────────────────────────────────────────────────────── */
export interface Testimonial { src: string; poster: string; name: string; role: string; rating: number; quote: string }

// Video testimonials can also come from a brand folder (src/brands/<id>/testimonials.ts); they go first.
const fromBrands = Object.values(
	import.meta.glob<{ default: Testimonial[] }>("/src/brands/*/testimonials.ts", { eager: true }),
).flatMap((m) => m.default);

const TESTIMONIALS: Testimonial[] = [
	...fromBrands,
	{
		src: '',
		poster: '',
		name: 'Priya Desai',
		role: 'CEO, Luminary Wellness',
		rating: 5,
		quote:
			"Appointment reminders and review requests run themselves now. I didn't realise how much time I was wasting.",
	},
	{
		src: '',
		poster: '',
		name: 'Marcus Webb',
		role: 'Operations Director, Foundry Labs',
		rating: 4,
		quote:
			'Best-in-class pipeline visibility. Our ops team finally has a single source of truth.',
	},
];

/* ── Star row ─────────────────────────────────────────────────────────── */
const StarRow = ({
	rating,
	animate = false,
	delay = 0,
}: {
	rating: number;
	animate?: boolean;
	delay?: number;
}) => {
	const ref = useRef(null);
	const inView = useInView(ref, { once: true });

	return (
		<div
			ref={ref}
			className="flex items-center gap-1"
		>
			{[...Array(5)].map((_, i) => (
				<motion.div
					key={i}
					initial={animate ? { opacity: 0, scale: 0.4 } : false}
					animate={animate && inView ? { opacity: 1, scale: 1 } : {}}
					transition={{
						delay: delay + i * 0.07,
						duration: 0.3,
						ease: 'backOut',
					}}
				>
					<Star
						className={`w-4 h-4 ${i < rating ? 'text-amber-400 fill-amber-400/90' : 'text-white/10 fill-white/10'}`}
					/>
				</motion.div>
			))}
		</div>
	);
};

/* ── Single video card ────────────────────────────────────────────────── */
const VideoCard = ({
	testimonial,
	index,
}: {
	testimonial: (typeof TESTIMONIALS)[0];
	index: number;
}) => {
	const videoRef = useRef<HTMLVideoElement>(null);
	const cardRef = useRef(null);
	const inView = useInView(cardRef, { once: true, margin: '-60px' });

	const [playing, setPlaying] = useState(false);
	const [muted, setMuted] = useState(false);
	const [hasStarted, setHasStarted] = useState(false);

	const toggle = () => {
		if (!videoRef.current) return;
		if (playing) {
			videoRef.current.pause();
			setPlaying(false);
		} else {
			videoRef.current.play();
			setPlaying(true);
			setHasStarted(true);
		}
	};

	const toggleMute = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (!videoRef.current) return;
		videoRef.current.muted = !muted;
		setMuted(!muted);
	};

	return (
		<motion.div
			ref={cardRef}
			initial={{ opacity: 0, y: 48 }}
			animate={inView ? { opacity: 1, y: 0 } : {}}
			transition={{
				duration: 0.7,
				delay: index * 0.12,
				ease: [0.16, 1, 0.3, 1],
			}}
			className="group relative flex flex-col"
		>
			{/* Video container */}
			<div
				className="relative rounded-2xl overflow-hidden border border-white/[0.07] bg-slate-900 aspect-[9/14] cursor-pointer"
				onClick={toggle}
				style={{ boxShadow: '0 0 0 0 transparent' }}
			>
				{/* Hover / focus glow */}
				<div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-b from-ember-600/[0.06] to-transparent pointer-events-none z-10" />

				{/* Video element */}
				{testimonial.src ? (
					<video
						ref={videoRef}
						src={testimonial.src}
						poster={testimonial.poster || undefined}
						className="absolute inset-0 w-full h-full object-cover"
						playsInline
						onEnded={() => setPlaying(false)}
					/>
				) : (
					/* Placeholder gradient when no video src is set */
					<div
						className="absolute inset-0 w-full h-full"
						style={{
							background: `linear-gradient(160deg,
                hsl(${15 + index * 6},22%,14%) 0%,
                hsl(${280 + index * 4},10%,8%) 100%)`,
						}}
					>
						{/* Subtle grid */}
						<div
							className="absolute inset-0 opacity-[0.04]"
							style={{
								backgroundImage:
									'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
								backgroundSize: '32px 32px',
							}}
						/>
						{/* Placeholder avatar */}
						<div className="absolute inset-0 flex items-center justify-center">
							<div className="w-16 h-16 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
								<span className="text-2xl font-bold text-white/20">
									{testimonial.name[0]}
								</span>
							</div>
						</div>
					</div>
				)}

				{/* Gradient overlay — bottom fade for text readability */}
				<div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent pointer-events-none z-20" />

				{/* Top-left: star rating */}
				<div className="absolute top-3.5 left-3.5 z-30 bg-black/40 backdrop-blur-md rounded-xl px-3 py-1.5 border border-white/[0.08]">
					<StarRow
						rating={testimonial.rating}
						animate
						delay={index * 0.12 + 0.3}
					/>
				</div>

				{/* Top-right: mute toggle (only after video starts) */}
				<AnimatePresence>
					{hasStarted && (
						<motion.button
							initial={{ opacity: 0, scale: 0.8 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.8 }}
							transition={{ duration: 0.2 }}
							onClick={toggleMute}
							className="absolute top-3.5 right-3.5 z-30 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/[0.08] flex items-center justify-center hover:bg-black/60 transition-colors"
						>
							{muted ? (
								<VolumeX className="w-3.5 h-3.5 text-white/60" />
							) : (
								<Volume2 className="w-3.5 h-3.5 text-white/60" />
							)}
						</motion.button>
					)}
				</AnimatePresence>

				{/* Centre play / pause button */}
				<AnimatePresence mode="wait">
					{!playing && (
						<motion.div
							key="play"
							initial={{ opacity: 0, scale: 0.75 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.85 }}
							transition={{ duration: 0.2 }}
							className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
						>
							<div className="w-14 h-14 rounded-full bg-white/[0.1] backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl group-hover:bg-white/[0.16] transition-colors duration-300">
								<Play className="w-5 h-5 text-white fill-white ml-0.5" />
							</div>
						</motion.div>
					)}
				</AnimatePresence>

				{/* Bottom: name + role */}
				<div className="absolute bottom-0 inset-x-0 z-30 p-4">
					<p className="text-sm font-semibold text-white leading-tight">
						{testimonial.name}
					</p>
					<p className="text-[11px] text-white/40 mt-0.5">{testimonial.role}</p>
				</div>
			</div>

			{/* Quote below card */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={inView ? { opacity: 1 } : {}}
				transition={{ delay: index * 0.12 + 0.3, duration: 0.6 }}
				className="mt-4 px-1"
			>
				<p className="text-sm text-silver/70 leading-relaxed italic">
					"{testimonial.quote}"
				</p>
			</motion.div>
		</motion.div>
	);
};

/* ── Section ──────────────────────────────────────────────────────────── */
const TestimonialsSection = () => {
	const headerRef = useRef(null);
	const headerInView = useInView(headerRef, { once: true, margin: '-80px' });

	return (
		<section className="relative py-32 lg:py-40 overflow-hidden">
			{/* Background */}
			<div className="absolute inset-0 bg-slate-950" />
			<div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-ember-500/20 to-transparent" />

			{/* Ambient glow */}
			<motion.div
				animate={{ scale: [1, 1.12, 1], opacity: [0.06, 0.12, 0.06] }}
				transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
				className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] rounded-full bg-ember-600/[0.08] blur-[140px] pointer-events-none"
			/>

			<div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
				{/* Header */}
				<div
					ref={headerRef}
					className="text-center mb-16 lg:mb-20"
				>
					<motion.p
						initial={{ opacity: 0, y: 16 }}
						animate={headerInView ? { opacity: 1, y: 0 } : {}}
						transition={{ duration: 0.5 }}
						className="text-xs uppercase tracking-[0.2em] text-ember-400/60 font-medium mb-4"
					>
						In their words
					</motion.p>
					<motion.h2
						initial={{ opacity: 0, y: 24 }}
						animate={headerInView ? { opacity: 1, y: 0 } : {}}
						transition={{ duration: 0.6, delay: 0.08 }}
						className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-5"
					>
						<span className="text-white">Business owners </span>
						<span className="bg-gradient-to-r from-ember-400 to-ember-400 bg-clip-text text-transparent">
							on working with {BRAND.short}
						</span>
					</motion.h2>
					<motion.p
						initial={{ opacity: 0, y: 16 }}
						animate={headerInView ? { opacity: 1, y: 0 } : {}}
						transition={{ duration: 0.6, delay: 0.15 }}
						className="text-lg text-silver/70 max-w-lg mx-auto"
					>
						Hear it from the people who use it every day.
					</motion.p>

					{/* Aggregate rating */}
					<motion.div
						initial={{ opacity: 0, y: 12 }}
						animate={headerInView ? { opacity: 1, y: 0 } : {}}
						transition={{ duration: 0.5, delay: 0.25 }}
						className="mt-8 inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/[0.03] border border-white/[0.07]"
					>
						<StarRow
							rating={5}
							animate
							delay={0.3}
						/>
						<span className="text-sm font-semibold text-white/80">4.9</span>
						<span className="text-xs text-white/30">from 200+ reviews</span>
					</motion.div>
				</div>

				{/* Video grid */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
					{TESTIMONIALS.map((t, i) => (
						<VideoCard
							key={i}
							testimonial={t}
							index={i}
						/>
					))}
				</div>
			</div>
		</section>
	);
};

export default TestimonialsSection;
