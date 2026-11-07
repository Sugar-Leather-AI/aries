import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AppLink } from '@/components/AppLink';
import {
	motion,
	useScroll,
	useTransform,
	useInView,
	AnimatePresence,
} from 'framer-motion';
import {
	ArrowRight,
	Play,
	Zap,
	Users,
	BarChart3,
	MessageSquare,
	ChevronRight,
	Bot,
	Mail,
	Phone,
	Globe,
	Shield,
	Workflow,
	TrendingUp,
	Sparkles,
	Plus,
	Minus,
	PenTool,
	Search,
	Star,
	Calendar,
	Building2,
	Send,
	BadgeCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import TestimonialsSection from '@/components/TestimonialsSection';
import { AriesLogo, AriesMark } from '@/components/brand/AriesLogo';

const Landing = () => {
	const [scrolled, setScrolled] = useState(false);
	useEffect(() => {
		const handler = () => setScrolled(window.scrollY > 20);
		window.addEventListener('scroll', handler, { passive: true });
		return () => window.removeEventListener('scroll', handler);
	}, []);

	return (
		<div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
			{/* ───── Nav ───── */}
			<motion.nav
				initial={{ y: -20, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				transition={{ duration: 0.5 }}
				className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
					scrolled
						? 'bg-slate-950/70 backdrop-blur-2xl border-b border-white/[0.06] shadow-2xl shadow-ember-950/20'
						: 'bg-transparent'
				}`}
			>
				<div className="max-w-7xl mx-auto px-6 lg:px-8">
					<div className="flex items-center justify-between h-16 lg:h-20">
						{/* Logo */}
						<Link
							to="/"
							className="flex items-center gap-2.5 group"
						>
							<AriesLogo tone="light" markClassName="w-9 h-7" />
						</Link>

						{/* Nav links — desktop */}
						<div className="hidden md:flex items-center gap-1">
							{[
								{ label: 'Product', to: '#' },
								{ label: 'Features', to: '#' },
								{ label: 'Pricing', to: '/pricing' },
								{ label: 'About', to: '#' },
							].map((item) => (
								<Link
									key={item.label}
									to={item.to}
									className="px-4 py-2 text-sm text-silver hover:text-white rounded-lg hover:bg-white/[0.04] transition-all duration-200"
								>
									{item.label}
								</Link>
							))}
						</div>

						{/* CTA buttons */}
						<div className="flex items-center gap-3">
							<AppLink to="/login">
								<Button
									variant="ghost"
									className="text-sm text-silver hover:text-white hover:bg-white/[0.06] hidden sm:inline-flex"
								>
									Sign in
								</Button>
							</AppLink>
							<AppLink to="/signup">
								<Button className="text-sm bg-gradient-to-r from-ember-600 to-ember-600 hover:from-ember-500 hover:to-ember-500 text-white shadow-lg shadow-ember-600/25 border-0 px-5">
									Book a demo
									<ChevronRight className="w-4 h-4 ml-1" />
								</Button>
							</AppLink>
						</div>
					</div>
				</div>
			</motion.nav>

			{/* ───── Hero ───── */}
			<div className="relative z-[1]">
				<ScrollFade>
					<section className="relative min-h-screen flex items-center justify-center pt-20">
						{/* Background layers */}
						<div className="absolute inset-0">
							{/* Base gradient */}
							<div className="absolute inset-0 bg-gradient-to-b from-obsidian/50 via-slate-950 to-slate-950" />
							{/* Radial accents */}
							<div
								className="absolute inset-0"
								style={{
									backgroundImage:
										'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(204,102,51,0.15) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 20% 20%, rgba(204,102,51,0.1) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 80% 30%, rgba(204,102,51,0.08) 0%, transparent 50%)',
								}}
							/>
							{/* Grid overlay */}
							<div
								className="absolute inset-0 opacity-[0.025]"
								style={{
									backgroundImage:
										'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
									backgroundSize: '80px 80px',
								}}
							/>
						</div>

						{/* Animated orbs */}
						<motion.div
							animate={{ y: [0, -30, 0], x: [0, 15, 0] }}
							transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
							className="absolute top-32 right-[15%] w-[500px] h-[500px] rounded-full bg-ember-600/[0.07] blur-[100px]"
						/>
						<motion.div
							animate={{ y: [0, 20, 0], x: [0, -20, 0] }}
							transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
							className="absolute bottom-20 left-[10%] w-[400px] h-[400px] rounded-full bg-ember-600/[0.06] blur-[100px]"
						/>
						<motion.div
							animate={{ scale: [1, 1.1, 1], opacity: [0.04, 0.08, 0.04] }}
							transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
							className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-ember-500/[0.04] blur-[120px]"
						/>

						{/* Hero content */}
						<div className="relative z-10 max-w-5xl mx-auto px-6 lg:px-8 text-center">
							{/* Badge */}
							<motion.div
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.6 }}
							>
								<div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-ember-500/[0.08] border border-ember-500/[0.12] mb-8">
									<div className="w-1.5 h-1.5 rounded-full bg-ember-400 animate-pulse" />
									<span className="text-xs font-medium text-ember-300/80 tracking-wide">
										AI agents and CRM, now in beta
									</span>
									<ArrowRight className="w-3 h-3 text-ember-400/60" />
								</div>
							</motion.div>

							{/* Headline */}
							<motion.h1
								initial={{ opacity: 0, y: 30 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.7, delay: 0.1 }}
								className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight leading-[1.05] mb-6"
							>
								<span className="block">From scattered</span>
								<span className="block bg-gradient-to-r from-ember-400 via-ember-400 to-ember-400 bg-clip-text text-transparent">
									to in control
								</span>
							</motion.h1>

							{/* Subtitle */}
							<motion.p
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.7, delay: 0.2 }}
								className="text-lg sm:text-xl text-silver/70 max-w-2xl mx-auto leading-relaxed mb-10"
							>
								Aries AI answers your email, books appointments, follows up with leads and keeps your pipeline moving. One calm system, with AI agents that handle the routine work and bring the decisions to you.
							</motion.p>

							{/* CTA buttons */}
							<motion.div
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.6, delay: 0.3 }}
								className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
							>
								<AppLink to="/signup">
									<Button
										size="lg"
										className="bg-gradient-to-r from-ember-600 to-ember-600 hover:from-ember-500 hover:to-ember-500 text-white shadow-2xl shadow-ember-600/20 border-0 px-8 h-12 text-base font-medium group"
									>
										Book a demo
											<ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
									</Button>
								</AppLink>
								<Button
									size="lg"
									variant="ghost"
									className="text-silver hover:text-white hover:bg-white/[0.05] px-8 h-12 text-base font-medium group"
								>
									<Play className="w-4 h-4 mr-2 group-hover:text-ember-400 transition-colors" />
									Watch demo
								</Button>
							</motion.div>

							{/* Floating dashboard preview */}
							<motion.div
								initial={{ opacity: 0, y: 60 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{
									duration: 1,
									delay: 0.5,
									ease: [0.16, 1, 0.3, 1],
								}}
								className="relative max-w-4xl mx-auto"
							>
								{/* Glow behind the card */}
								<div className="absolute -inset-4 bg-gradient-to-b from-ember-600/20 via-ember-600/10 to-transparent rounded-3xl blur-2xl" />

								{/* Dashboard mockup */}
								<div className="relative rounded-2xl border border-white/[0.08] bg-slate-900/80 backdrop-blur-xl shadow-2xl shadow-ember-950/50 overflow-hidden">
									{/* Window chrome */}
									<div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/[0.06] bg-slate-900/50">
										<div className="flex gap-1.5">
											<div className="w-2.5 h-2.5 rounded-full bg-white/10" />
											<div className="w-2.5 h-2.5 rounded-full bg-white/10" />
											<div className="w-2.5 h-2.5 rounded-full bg-white/10" />
										</div>
										<div className="flex-1 flex justify-center">
											<div className="px-4 py-1 rounded-md bg-white/[0.04] text-xs text-ember-300/40 font-mono">
												sequence.sugarandleather.com
											</div>
										</div>
										<div className="w-12" />
									</div>

									{/* Dashboard content */}
									<div className="p-6 grid grid-cols-12 gap-4 min-h-[340px]">
										{/* Sidebar mock */}
										<div className="col-span-2 hidden sm:flex flex-col gap-2">
											{[...Array(7)].map((_, i) => (
												<div
													key={i}
													className={`h-3 rounded-full ${
														i === 0
															? 'bg-ember-500/30 w-full'
															: 'bg-white/[0.04] w-4/5'
													}`}
												/>
											))}
										</div>

										{/* Main content */}
										<div className="col-span-12 sm:col-span-10 space-y-4">
											{/* Stat cards row */}
											<div className="grid grid-cols-4 gap-3">
												{[
													{
														icon: Zap,
														value: '2,847',
														label: 'Active leads',
														color: 'violet',
													},
													{
														icon: Users,
														value: '1,234',
														label: 'Contacts',
														color: 'indigo',
													},
													{
														icon: BarChart3,
														value: '$128k',
														label: 'Pipeline',
														color: 'purple',
													},
													{
														icon: MessageSquare,
														value: '94%',
														label: 'Response rate',
														color: 'fuchsia',
													},
												].map((stat, i) => (
													<motion.div
														key={stat.label}
														initial={{ opacity: 0, y: 15 }}
														animate={{ opacity: 1, y: 0 }}
														transition={{ delay: 0.8 + i * 0.1 }}
														className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3"
													>
														<stat.icon
															className={`w-3.5 h-3.5 mb-2 text-${stat.color}-400/60`}
														/>
														<div className="text-sm font-semibold text-white/80">
															{stat.value}
														</div>
														<div className="text-[10px] text-white/25 mt-0.5">
															{stat.label}
														</div>
													</motion.div>
												))}
											</div>

											{/* Chart area */}
											<div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-4 flex-1">
												<div className="flex items-center justify-between mb-4">
													<div className="h-2.5 w-24 rounded-full bg-white/[0.06]" />
													<div className="flex gap-2">
														<div className="h-2 w-10 rounded-full bg-white/[0.04]" />
														<div className="h-2 w-10 rounded-full bg-white/[0.04]" />
													</div>
												</div>
												{/* Bar chart mockup */}
												<div className="flex items-end gap-2 h-28">
													{[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 95, 50].map(
														(h, i) => (
															<motion.div
																key={i}
																initial={{ height: 0 }}
																animate={{ height: `${h}%` }}
																transition={{
																	delay: 1.0 + i * 0.05,
																	duration: 0.6,
																	ease: [0.16, 1, 0.3, 1],
																}}
																className="flex-1 rounded-t-sm bg-gradient-to-t from-ember-600/30 to-ember-400/10"
															/>
														),
													)}
												</div>
											</div>
										</div>
									</div>
								</div>

								{/* Bottom fade */}
								<div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />
							</motion.div>

							{/* Social proof */}
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 1.2, duration: 0.8 }}
								className="mt-16 flex flex-col items-center gap-4"
							>
								<p className="text-xs text-ember-300/30 uppercase tracking-widest font-medium">
									Made for businesses that run on relationships
								</p>
								<div className="flex items-center gap-8">
									{['Clinics', 'Agencies', 'Salons', 'Trades', 'Consultants'].map(
										(name) => (
											<span
												key={name}
												className="text-sm font-medium text-white/[0.12] hover:text-white/20 transition-colors cursor-default"
											>
												{name}
											</span>
										),
									)}
								</div>
							</motion.div>
						</div>
					</section>
				</ScrollFade>
			</div>

			{/* ───── Features ───── */}
			<div className="relative z-[2]">
				<FeaturesSection />
			</div>

			{/* ───── Extended Features ───── */}
			<div className="relative z-[3]">
				<ExtendedFeaturesSection />
			</div>

			{/* ───── Testimonials ───── */}
			<div className="relative z-[4]">
				<TestimonialsSection />
			</div>

			{/* ───── FAQ ───── */}
			<div className="relative z-[5]">
				<FAQSection />
			</div>

			{/* ───── CTA ───── */}
			<div className="relative z-[6]">
				<CTASection />
			</div>

			{/* ───── Footer ───── */}
			<div className="relative z-[7]">
				<FooterSection />
			</div>
		</div>
	);
};

/* ──────────────────────────────────────────────────────────────────────── */
/*  Features Bento Grid                                                    */
/* ──────────────────────────────────────────────────────────────────────── */

const ScrollFade = ({
	children,
	className = '',
}: {
	children: React.ReactNode;
	className?: string;
}) => {
	const ref = useRef(null);
	const { scrollYProgress } = useScroll({
		target: ref,
		offset: ['start start', 'end start'],
	});
	const opacity = useTransform(scrollYProgress, [0.5, 0.8], [1, 0]);
	const scale = useTransform(scrollYProgress, [0.5, 0.8], [1, 0.94]);
	const y = useTransform(scrollYProgress, [0.5, 0.8], [0, 60]);
	const filter = useTransform(
		scrollYProgress,
		[0.5, 0.8],
		['blur(0px)', 'blur(6px)'],
	);
	return (
		<div
			ref={ref}
			className={`relative ${className}`}
		>
			<motion.div
				style={{
					opacity,
					scale,
					y,
					filter,
					willChange: 'transform, opacity, filter',
				}}
				className="origin-top"
			>
				{children}
			</motion.div>
		</div>
	);
};

const FadeIn = ({
	children,
	className = '',
	delay = 0,
}: {
	children: React.ReactNode;
	className?: string;
	delay?: number;
}) => {
	const ref = useRef(null);
	const inView = useInView(ref, { once: true, margin: '-80px' });
	return (
		<motion.div
			ref={ref}
			initial={{ opacity: 0, y: 40 }}
			animate={inView ? { opacity: 1, y: 0 } : {}}
			transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
			className={className}
		>
			{children}
		</motion.div>
	);
};

const BentoCard = ({
	children,
	className = '',
}: {
	children: React.ReactNode;
	className?: string;
}) => (
	<div
		className={`group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden hover:border-ember-500/20 transition-all duration-500 ${className}`}
	>
		{/* Hover glow */}
		<div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-ember-600/[0.04] to-transparent" />
		<div className="relative z-10 h-full">{children}</div>
	</div>
);

const FeaturesSection = () => {
	const sectionRef = useRef(null);
	const inView = useInView(sectionRef, { once: true, margin: '-100px' });

	return (
		<ScrollFade>
			<section
				ref={sectionRef}
				className="relative py-32 lg:py-40"
			>
				{/* Subtle background */}
				<div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950/95 to-slate-950" />
				<div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-ember-500/20 to-transparent" />

				<div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
					{/* Section header */}
					<FadeIn className="text-center mb-20">
						<p className="text-xs uppercase tracking-[0.2em] text-ember-400/60 font-medium mb-4">
							One system
						</p>
						<h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
							<span className="text-white">Everything in one place, </span>
							<span className="bg-gradient-to-r from-ember-400 to-ember-400 bg-clip-text text-transparent">
								nothing left hanging
							</span>
						</h2>
						<p className="text-lg text-silver/70 max-w-xl mx-auto">
							Inbox, contacts, pipeline and calendar share one picture, so every agent knows what the others have already done.
						</p>
					</FadeIn>

					{/* Bento grid */}
					<div className="grid grid-cols-12 gap-4 lg:gap-5">
						{/* ── Card 1: AI Agents (large, spans 7 cols) ── */}
						<FadeIn
							delay={0}
							className="col-span-12 lg:col-span-7"
						>
							<BentoCard className="p-8 lg:p-10 min-h-[380px] flex flex-col justify-between">
								<div>
									<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ember-500/10 border border-ember-500/15 mb-6">
										<Bot className="w-3.5 h-3.5 text-ember-400" />
										<span className="text-xs font-medium text-ember-300/80">
											AI Agents
										</span>
									</div>
									<h3 className="text-2xl lg:text-3xl font-bold text-white mb-3 tracking-tight">
										Routine work, handled
										<br className="hidden sm:block" /> around the clock
									</h3>
									<p className="text-sm text-silver/70 max-w-md leading-relaxed">
										Agents qualify leads, follow up, book appointments and answer customers. Anything unusual or sensitive comes to you instead.
									</p>
								</div>

								{/* Animated agent visualization */}
								<div className="mt-8 flex items-end gap-3">
									{[
										{
											name: 'Lead Scout',
											status: 'Qualifying 3 leads...',
											progress: 72,
										},
										{
											name: 'Outreach',
											status: 'Sending follow-ups...',
											progress: 45,
										},
										{
											name: 'Support',
											status: 'Resolving ticket #204',
											progress: 88,
										},
									].map((agent, i) => (
										<motion.div
											key={agent.name}
											initial={{ opacity: 0, y: 20 }}
											animate={inView ? { opacity: 1, y: 0 } : {}}
											transition={{ delay: 0.4 + i * 0.15, duration: 0.6 }}
											className="flex-1 rounded-xl bg-white/[0.03] border border-white/[0.06] p-3.5"
										>
											<div className="flex items-center gap-2 mb-2.5">
												<motion.div
													animate={{ scale: [1, 1.3, 1] }}
													transition={{
														duration: 2,
														repeat: Infinity,
														delay: i * 0.7,
													}}
													className="w-2 h-2 rounded-full bg-emerald-400"
												/>
												<span className="text-xs font-medium text-white/70">
													{agent.name}
												</span>
											</div>
											<p className="text-[10px] text-white/30 mb-2.5 truncate">
												{agent.status}
											</p>
											<div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
												<motion.div
													initial={{ width: 0 }}
													animate={
														inView ? { width: `${agent.progress}%` } : {}
													}
													transition={{
														delay: 0.8 + i * 0.15,
														duration: 1.5,
														ease: 'easeOut',
													}}
													className="h-full rounded-full bg-gradient-to-r from-ember-500 to-ember-500"
												/>
											</div>
										</motion.div>
									))}
								</div>
							</BentoCard>
						</FadeIn>

						{/* ── Card 2: Omnichannel (spans 5 cols) ── */}
						<FadeIn
							delay={0.1}
							className="col-span-12 lg:col-span-5"
						>
							<BentoCard className="p-8 lg:p-10 min-h-[380px] flex flex-col">
								<div className="mb-6">
									<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ember-500/10 border border-ember-500/15 mb-6">
										<Globe className="w-3.5 h-3.5 text-ember-400" />
										<span className="text-xs font-medium text-ember-300/80">
											Omnichannel
										</span>
									</div>
									<h3 className="text-2xl font-bold text-white mb-3 tracking-tight">
										Every channel,
										<br />
										one thread
									</h3>
									<p className="text-sm text-silver/70 leading-relaxed">
										Email, SMS and website chat in one conversation for each contact.
									</p>
								</div>

								{/* Animated message bubbles */}
								<div className="flex-1 flex flex-col justify-end gap-2.5">
									{[
										{
											channel: Mail,
											label: 'Email',
											msg: "Hi! I'd love to learn more about...",
											side: 'left',
											color: 'violet',
										},
										{
											channel: Phone,
											label: 'SMS',
											msg: 'Sure! Let me schedule a demo for you.',
											side: 'right',
											color: 'indigo',
										},
										{
											channel: MessageSquare,
											label: 'Chat',
											msg: 'Perfect, Thursday works great!',
											side: 'left',
											color: 'purple',
										},
									].map((m, i) => (
										<motion.div
											key={i}
											initial={{ opacity: 0, x: m.side === 'left' ? -20 : 20 }}
											animate={inView ? { opacity: 1, x: 0 } : {}}
											transition={{ delay: 0.5 + i * 0.2, duration: 0.5 }}
											className={`flex items-start gap-2 ${m.side === 'right' ? 'flex-row-reverse' : ''}`}
										>
											<div
												className={`w-7 h-7 rounded-lg bg-${m.color}-500/15 flex items-center justify-center shrink-0`}
											>
												<m.channel
													className={`w-3.5 h-3.5 text-${m.color}-400/70`}
												/>
											</div>
											<div
												className={`rounded-xl px-3.5 py-2 max-w-[200px] ${
													m.side === 'right'
														? 'bg-gradient-to-r from-ember-600/20 to-ember-600/20 border border-ember-500/15'
														: 'bg-white/[0.04] border border-white/[0.06]'
												}`}
											>
												<p className="text-[11px] text-white/50 leading-relaxed">
													{m.msg}
												</p>
											</div>
										</motion.div>
									))}
								</div>
							</BentoCard>
						</FadeIn>

						{/* ── Card 3: Smart Pipeline (spans 5 cols) ── */}
						<FadeIn
							delay={0.15}
							className="col-span-12 lg:col-span-5"
						>
							<BentoCard className="p-8 lg:p-10 min-h-[340px] flex flex-col">
								<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ember-500/10 border border-ember-500/15 mb-6 w-fit">
									<TrendingUp className="w-3.5 h-3.5 text-ember-400" />
									<span className="text-xs font-medium text-ember-300/80">
										Smart Pipeline
									</span>
								</div>
								<h3 className="text-2xl font-bold text-white mb-3 tracking-tight">
									A pipeline you can trust
								</h3>
								<p className="text-sm text-silver/70 leading-relaxed mb-8">
									AI scores and prioritises your deals and flags the ones that stall, so nothing slips through.
								</p>

								{/* Pipeline stage visualization */}
								<div className="flex-1 flex items-end">
									<div className="w-full flex gap-2">
										{[
											{ label: 'Lead', count: 24, w: '100%' },
											{ label: 'Qualified', count: 18, w: '75%' },
											{ label: 'Proposal', count: 12, w: '50%' },
											{ label: 'Negotiation', count: 7, w: '30%' },
											{ label: 'Won', count: 5, w: '20%' },
										].map((stage, i) => (
											<div
												key={stage.label}
												className="flex-1 flex flex-col items-center gap-2"
											>
												<motion.div
													initial={{ height: 0 }}
													animate={inView ? { height: stage.w } : {}}
													transition={{
														delay: 0.5 + i * 0.1,
														duration: 0.8,
														ease: [0.16, 1, 0.3, 1],
													}}
													className="w-full max-h-[120px] rounded-t-lg bg-gradient-to-t from-ember-600/25 to-ember-400/5 border border-white/[0.04] border-b-0 relative"
												>
													<span className="absolute top-2 inset-x-0 text-center text-xs font-semibold text-white/50">
														{stage.count}
													</span>
												</motion.div>
												<span className="text-[9px] text-white/25 font-medium tracking-wide">
													{stage.label}
												</span>
											</div>
										))}
									</div>
								</div>
							</BentoCard>
						</FadeIn>

						{/* ── Card 4: Automation (spans 4 cols) ── */}
						<FadeIn
							delay={0.2}
							className="col-span-12 sm:col-span-6 lg:col-span-4"
						>
							<BentoCard className="p-8 min-h-[340px] flex flex-col">
								<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ember-500/10 border border-ember-500/15 mb-6 w-fit">
									<Workflow className="w-3.5 h-3.5 text-ember-400" />
									<span className="text-xs font-medium text-ember-300/80">
										Automation
									</span>
								</div>
								<h3 className="text-xl font-bold text-white mb-3 tracking-tight">
									Switch it on
									<br />
									and it keeps going
								</h3>
								<p className="text-sm text-silver/70 leading-relaxed mb-6">
									Reminders, review requests, welcome emails and payment follow-ups run by themselves.
								</p>

								{/* Workflow node visualization */}
								<div className="flex-1 flex flex-col justify-end">
									<div className="space-y-2">
										{[
											{
												label: 'New lead from website',
												icon: Sparkles,
												active: true,
											},
											{ label: 'Enrich with AI', icon: Bot, active: true },
											{
												label: 'Add to pipeline',
												icon: TrendingUp,
												active: false,
											},
										].map((node, i) => (
											<motion.div
												key={node.label}
												initial={{ opacity: 0, x: -15 }}
												animate={inView ? { opacity: 1, x: 0 } : {}}
												transition={{ delay: 0.6 + i * 0.15 }}
												className="relative"
											>
												{i > 0 && (
													<div className="absolute -top-2 left-5 w-px h-2 bg-gradient-to-b from-ember-500/30 to-transparent" />
												)}
												<div
													className={`flex items-center gap-3 rounded-xl px-4 py-2.5 border ${
														node.active
															? 'bg-ember-500/[0.06] border-ember-500/15'
															: 'bg-white/[0.02] border-white/[0.05]'
													}`}
												>
													<node.icon
														className={`w-3.5 h-3.5 ${node.active ? 'text-ember-400/70' : 'text-white/20'}`}
													/>
													<span
														className={`text-xs ${node.active ? 'text-white/60' : 'text-white/30'}`}
													>
														{node.label}
													</span>
													{node.active && (
														<motion.div
															animate={{ opacity: [0.4, 1, 0.4] }}
															transition={{ duration: 2, repeat: Infinity }}
															className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400"
														/>
													)}
												</div>
											</motion.div>
										))}
									</div>
								</div>
							</BentoCard>
						</FadeIn>

						{/* ── Card 5: Security (spans 3 cols) ── */}
						<FadeIn
							delay={0.25}
							className="col-span-12 sm:col-span-6 lg:col-span-3"
						>
							<BentoCard className="p-8 min-h-[340px] flex flex-col items-center justify-center text-center">
								{/* Animated shield */}
								<motion.div
									animate={{ scale: [1, 1.05, 1] }}
									transition={{
										duration: 4,
										repeat: Infinity,
										ease: 'easeInOut',
									}}
									className="relative mb-6"
								>
									<div className="absolute inset-0 rounded-full bg-ember-500/10 blur-xl scale-150" />
									<div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-ember-500/15 to-ember-500/15 border border-ember-500/20 flex items-center justify-center">
										<Shield className="w-7 h-7 text-ember-400/80" />
									</div>
								</motion.div>
								<h3 className="text-lg font-bold text-white mb-2 tracking-tight">
									Your data stays yours
								</h3>
								<p className="text-xs text-silver/70 leading-relaxed">
									Encrypted in transit and at rest, hosted on Google Cloud and kept separate for every account.
								</p>

								{/* Animated security dots */}
								<div className="mt-6 flex items-center gap-1.5">
									{[...Array(5)].map((_, i) => (
										<motion.div
											key={i}
											animate={{ opacity: [0.15, 0.6, 0.15] }}
											transition={{
												duration: 2,
												repeat: Infinity,
												delay: i * 0.3,
											}}
											className="w-2 h-2 rounded-full bg-ember-400"
										/>
									))}
								</div>
							</BentoCard>
						</FadeIn>

						{/* ── Card 6: Stats banner (full width) ── */}
						<FadeIn
							delay={0.3}
							className="col-span-12"
						>
							<BentoCard className="px-8 py-10 lg:px-16 lg:py-12">
								<div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
									{[
										{ value: '24/7', label: 'agents on duty', suffix: '' },
										{ value: '1', label: 'inbox for email, SMS and chat', suffix: '' },
										{ value: '~30', label: 'to research a new company', suffix: 's' },
										{ value: '0', label: 'tools to stitch together', suffix: '' },
									].map((stat, i) => (
										<motion.div
											key={stat.label}
											initial={{ opacity: 0, y: 20 }}
											animate={inView ? { opacity: 1, y: 0 } : {}}
											transition={{ delay: 0.5 + i * 0.1 }}
											className="text-center lg:text-left"
										>
											<div className="text-3xl lg:text-4xl font-bold tracking-tight mb-1">
												<span className="bg-gradient-to-r from-ember-400 to-ember-400 bg-clip-text text-transparent">
													{stat.value}
												</span>
												<span className="text-ember-400/60">
													{stat.suffix}
												</span>
											</div>
											<p className="text-sm text-silver/70">
												{stat.label}
											</p>
										</motion.div>
									))}
								</div>
							</BentoCard>
						</FadeIn>
					</div>
				</div>
			</section>
		</ScrollFade>
	);
};

/* ──────────────────────────────────────────────────────────────────────── */
/*  Extended Features Bento Grid                                            */
/* ──────────────────────────────────────────────────────────────────────── */

const ExtendedFeaturesSection = () => {
	const sectionRef = useRef(null);
	const inView = useInView(sectionRef, { once: true, margin: '-100px' });

	return (
		<ScrollFade>
			<section ref={sectionRef} className="relative py-24 lg:py-32">
				<div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950/95 to-slate-950" />
				<div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-ember-500/20 to-transparent" />

				<div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
					{/* Section header */}
					<FadeIn className="text-center mb-20">
						<p className="text-xs uppercase tracking-[0.2em] text-ember-400/60 font-medium mb-4">
							Room to grow
						</p>
						<h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
							<span className="text-white">More when you need it, </span>
							<span className="bg-gradient-to-r from-ember-400 to-ember-400 bg-clip-text text-transparent">
								already built in
							</span>
						</h2>
						<p className="text-lg text-silver/70 max-w-xl mx-auto">
							Content, prospecting, reviews, payments and company research, ready the day you want them.
						</p>
					</FadeIn>

					{/* Bento grid row 1 */}
					<div className="grid grid-cols-12 gap-4 lg:gap-5 mb-4 lg:mb-5">

						{/* ── AI Content Generation (7 cols) ── */}
						<FadeIn delay={0} className="col-span-12 lg:col-span-7">
							<BentoCard className="p-8 lg:p-10 min-h-[380px] flex flex-col justify-between">
								<div>
									<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ember-500/10 border border-ember-500/15 mb-6">
										<PenTool className="w-3.5 h-3.5 text-ember-400" />
										<span className="text-xs font-medium text-ember-300/80">AI Content</span>
									</div>
									<h3 className="text-2xl lg:text-3xl font-bold text-white mb-3 tracking-tight">
										A week of posts
										<br className="hidden sm:block" /> ready before lunch
									</h3>
									<p className="text-sm text-silver/70 max-w-md leading-relaxed">
										Draft LinkedIn posts and email campaigns in your own voice, based on what Aries knows about your business.
									</p>
								</div>

								{/* Animated post previews */}
								<div className="mt-8 space-y-2.5">
									{[
										{ platform: 'LinkedIn', preview: 'Three lessons I learned scaling to $1M ARR without a sales team...', progress: 100, color: 'indigo' },
										{ platform: 'Twitter/X', preview: 'Most CRMs collect data. Aries AI acts on it. 🧵', progress: 78, color: 'purple' },
										{ platform: 'Email', preview: 'Subject: Your Q2 pipeline gaps, and how to close them', progress: 55, color: 'violet' },
									].map((item, i) => (
										<motion.div
											key={item.platform}
											initial={{ opacity: 0, x: -20 }}
											animate={inView ? { opacity: 1, x: 0 } : {}}
											transition={{ delay: 0.4 + i * 0.15, duration: 0.5 }}
											className="flex items-start gap-3 rounded-xl bg-white/[0.03] border border-white/[0.05] px-3.5 py-3"
										>
											<span className={`text-[10px] font-semibold text-${item.color}-400/70 mt-0.5 w-16 shrink-0`}>{item.platform}</span>
											<p className="text-[11px] text-white/40 leading-relaxed flex-1 truncate">{item.preview}</p>
											<div className="w-8 h-1.5 rounded-full bg-white/[0.06] overflow-hidden shrink-0 mt-1.5">
												<motion.div
													initial={{ width: 0 }}
													animate={inView ? { width: `${item.progress}%` } : {}}
													transition={{ delay: 0.7 + i * 0.15, duration: 1.2, ease: 'easeOut' }}
													className={`h-full rounded-full bg-gradient-to-r from-${item.color}-500 to-ember-500`}
												/>
											</div>
										</motion.div>
									))}
								</div>
							</BentoCard>
						</FadeIn>

						{/* ── Lead Prospector (5 cols) ── */}
						<FadeIn delay={0.1} className="col-span-12 lg:col-span-5">
							<BentoCard className="p-8 lg:p-10 min-h-[380px] flex flex-col">
								<div className="mb-6">
									<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/15 mb-6">
										<Search className="w-3.5 h-3.5 text-emerald-400" />
										<span className="text-xs font-medium text-emerald-300/80">Lead Prospector</span>
									</div>
									<h3 className="text-2xl font-bold text-white mb-3 tracking-tight">
										Your next customers
										<br />are already out there
									</h3>
									<p className="text-sm text-silver/70 leading-relaxed">
										Aries finds businesses that match your ideal customer, scores how well they fit and drafts a first email for you to approve.
									</p>
								</div>

								{/* Animated prospect cards */}
								<div className="flex-1 flex flex-col justify-end gap-2">
									{[
										{ name: 'Ravi Patel', co: 'NexGen SaaS', score: 92, tag: 'High fit' },
										{ name: 'Priya Osei', co: 'CloudOps Co', score: 85, tag: 'Hot lead' },
										{ name: 'Marcus Webb', co: 'Foundry Labs', score: 78, tag: 'Follow up' },
									].map((p, i) => (
										<motion.div
											key={p.name}
											initial={{ opacity: 0, y: 15 }}
											animate={inView ? { opacity: 1, y: 0 } : {}}
											transition={{ delay: 0.5 + i * 0.15, duration: 0.5 }}
											className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/[0.05] px-3.5 py-3"
										>
											<div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
												<span className="text-[11px] font-bold text-emerald-400">{p.name[0]}</span>
											</div>
											<div className="flex-1 min-w-0">
												<p className="text-xs font-medium text-white/70 truncate">{p.name}</p>
												<p className="text-[10px] text-white/30 truncate">{p.co}</p>
											</div>
											<div className="text-right shrink-0">
												<p className="text-xs font-bold text-emerald-400">{p.score}</p>
												<p className="text-[9px] text-white/25">{p.tag}</p>
											</div>
										</motion.div>
									))}
								</div>
							</BentoCard>
						</FadeIn>
					</div>

					{/* Bento grid row 2 */}
					<div className="grid grid-cols-12 gap-4 lg:gap-5 mb-4 lg:mb-5">

						{/* ── Review Management (4 cols) ── */}
						<FadeIn delay={0.05} className="col-span-12 sm:col-span-6 lg:col-span-4">
							<BentoCard className="p-8 min-h-[340px] flex flex-col">
								<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/15 mb-6 w-fit">
									<Star className="w-3.5 h-3.5 text-amber-400" />
									<span className="text-xs font-medium text-amber-300/80">Reviews</span>
								</div>
								<h3 className="text-xl font-bold text-white mb-3 tracking-tight">
									Every review
									<br />answered well
								</h3>
								<p className="text-sm text-silver/70 leading-relaxed mb-6">
									Ask for a Google review after each appointment and reply to every one in a voice that sounds like you.
								</p>

								{/* Star rating animation */}
								<div className="flex-1 flex flex-col justify-end">
									<div className="flex items-center gap-1.5 mb-3">
										{[...Array(5)].map((_, i) => (
											<motion.div
												key={i}
												initial={{ opacity: 0, scale: 0.5 }}
												animate={inView ? { opacity: 1, scale: 1 } : {}}
												transition={{ delay: 0.6 + i * 0.08, duration: 0.3, ease: 'backOut' }}
											>
												<Star className="w-5 h-5 text-amber-400 fill-amber-400/80" />
											</motion.div>
										))}
										<span className="text-xs text-white/40 ml-2">4.9 avg</span>
									</div>
									<div className="space-y-1.5">
										{[{ w: '85%', label: '5★' }, { w: '10%', label: '4★' }, { w: '5%', label: '3★' }].map((bar, i) => (
											<div key={bar.label} className="flex items-center gap-2">
												<span className="text-[9px] text-white/25 w-5">{bar.label}</span>
												<div className="flex-1 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
													<motion.div
														initial={{ width: 0 }}
														animate={inView ? { width: bar.w } : {}}
														transition={{ delay: 0.8 + i * 0.1, duration: 1, ease: 'easeOut' }}
														className="h-full rounded-full bg-gradient-to-r from-amber-500/70 to-orange-400/70"
													/>
												</div>
											</div>
										))}
									</div>
								</div>
							</BentoCard>
						</FadeIn>

						{/* ── Appointments (4 cols) ── */}
						<FadeIn delay={0.1} className="col-span-12 sm:col-span-6 lg:col-span-4">
							<BentoCard className="p-8 min-h-[340px] flex flex-col">
								<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/15 mb-6 w-fit">
									<Calendar className="w-3.5 h-3.5 text-sky-400" />
									<span className="text-xs font-medium text-sky-300/80">Appointments</span>
								</div>
								<h3 className="text-xl font-bold text-white mb-3 tracking-tight">
									Booked, reminded
									<br />and paid
								</h3>
								<p className="text-sm text-silver/70 leading-relaxed mb-6">
									Agents book appointments by email and SMS, send the reminders and collect payment through Square.
								</p>

								{/* Calendar dots visualization */}
								<div className="flex-1 flex flex-col justify-end">
									<div className="grid grid-cols-7 gap-1.5">
										{['M','T','W','T','F','S','S'].map((d, i) => (
											<div key={i} className="text-center text-[9px] text-white/20 font-medium pb-1">{d}</div>
										))}
										{[...Array(28)].map((_, i) => {
											const booked = [2,5,8,9,14,16,17,22,23].includes(i);
											const today = i === 9;
											return (
												<motion.div
													key={i}
													initial={{ opacity: 0, scale: 0.7 }}
													animate={inView ? { opacity: 1, scale: 1 } : {}}
													transition={{ delay: 0.4 + i * 0.02, duration: 0.3 }}
													className={`aspect-square rounded-md flex items-center justify-center text-[9px] font-medium ${
														today
															? 'bg-sky-500/30 border border-sky-400/40 text-sky-300'
															: booked
															? 'bg-sky-500/10 border border-sky-500/20 text-sky-400/70'
															: 'bg-white/[0.02] text-white/20'
													}`}
												>
													{i + 1}
												</motion.div>
											);
										})}
									</div>
								</div>
							</BentoCard>
						</FadeIn>

						{/* ── Upsell Agent (4 cols) ── */}
						<FadeIn delay={0.15} className="col-span-12 sm:col-span-6 lg:col-span-4">
							<BentoCard className="p-8 min-h-[340px] flex flex-col">
								<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ember-500/10 border border-ember-500/15 mb-6 w-fit">
									<TrendingUp className="w-3.5 h-3.5 text-ember-400" />
									<span className="text-xs font-medium text-ember-300/80">Upsell Agent</span>
								</div>
								<h3 className="text-xl font-bold text-white mb-3 tracking-tight">
									Revenue hiding
									<br />in plain sight
								</h3>
								<p className="text-sm text-silver/70 leading-relaxed mb-6">
									Spots the customers ready for more and sends a personal, well-timed offer.
								</p>

								{/* Revenue uplift viz */}
								<div className="flex-1 flex flex-col justify-end">
									<div className="flex items-end gap-1.5 h-[80px]">
										{[30, 42, 38, 55, 50, 68, 75, 90].map((h, i) => (
											<motion.div
												key={i}
												initial={{ height: 0 }}
												animate={inView ? { height: `${h}%` } : {}}
												transition={{ delay: 0.5 + i * 0.07, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
												className="flex-1 rounded-t-md bg-gradient-to-t from-ember-600/40 to-ember-400/10 border border-white/[0.04] border-b-0"
											/>
										))}
									</div>
									<div className="mt-2 flex items-center justify-between">
										<span className="text-[9px] text-white/25">Last 8 weeks</span>
										<span className="text-xs font-semibold text-ember-400">+34% MRR</span>
									</div>
								</div>
							</BentoCard>
						</FadeIn>
					</div>

					{/* Bento grid row 3 */}
					<div className="grid grid-cols-12 gap-4 lg:gap-5">

						{/* ── Company Intelligence (5 cols) ── */}
						<FadeIn delay={0.05} className="col-span-12 lg:col-span-5">
							<BentoCard className="p-8 lg:p-10 min-h-[340px] flex flex-col">
								<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ember-500/10 border border-ember-500/15 mb-6 w-fit">
									<Building2 className="w-3.5 h-3.5 text-ember-400" />
									<span className="text-xs font-medium text-ember-300/80">Company Intelligence</span>
								</div>
								<h3 className="text-2xl font-bold text-white mb-3 tracking-tight">
									Know every prospect
									<br />before the first call
								</h3>
								<p className="text-sm text-silver/70 leading-relaxed mb-6">
									Research any company in moments: what they do, who to talk to and what they care about.
								</p>

								{/* Insight rows */}
								<div className="flex-1 flex flex-col justify-end space-y-2">
									{[
										{ label: 'Tech stack', value: 'Salesforce, HubSpot, Slack', icon: '⚙️' },
										{ label: 'Headcount', value: '280 to 320 employees', icon: '👥' },
										{ label: 'Intent signals', value: 'Hiring SDRs, budget cycle', icon: '📡' },
									].map((row, i) => (
										<motion.div
											key={row.label}
											initial={{ opacity: 0, x: -15 }}
											animate={inView ? { opacity: 1, x: 0 } : {}}
											transition={{ delay: 0.5 + i * 0.12, duration: 0.5 }}
											className="flex items-start gap-3 rounded-xl bg-white/[0.03] border border-white/[0.05] px-3.5 py-3"
										>
											<span className="text-sm">{row.icon}</span>
											<div className="min-w-0">
												<p className="text-[10px] text-white/30 mb-0.5">{row.label}</p>
												<p className="text-xs text-white/60 font-medium truncate">{row.value}</p>
											</div>
										</motion.div>
									))}
								</div>
							</BentoCard>
						</FadeIn>

						{/* ── Email Sales Agent (4 cols) ── */}
						<FadeIn delay={0.1} className="col-span-12 sm:col-span-6 lg:col-span-4">
							<BentoCard className="p-8 min-h-[340px] flex flex-col">
								<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ember-500/10 border border-ember-500/15 mb-6 w-fit">
									<Send className="w-3.5 h-3.5 text-ember-400" />
									<span className="text-xs font-medium text-ember-300/80">Email Sales Agent</span>
								</div>
								<h3 className="text-xl font-bold text-white mb-3 tracking-tight">
									Follow-ups
									<br />that never slip
								</h3>
								<p className="text-sm text-silver/70 leading-relaxed mb-6">
									Writes personal emails, follows up on time and hands warm replies back to you.
								</p>

								{/* Email sequence viz */}
								<div className="flex-1 flex flex-col justify-end space-y-2">
									{[
										{ step: 'Day 1', label: 'Initial outreach sent', done: true },
										{ step: 'Day 3', label: 'Follow-up, no reply yet', done: true },
										{ step: 'Day 7', label: 'Value-add touchpoint', done: false },
									].map((s, i) => (
										<motion.div
											key={s.step}
											initial={{ opacity: 0, x: -12 }}
											animate={inView ? { opacity: 1, x: 0 } : {}}
											transition={{ delay: 0.5 + i * 0.15, duration: 0.5 }}
											className="relative"
										>
											{i > 0 && (
												<div className="absolute -top-2 left-[22px] w-px h-2 bg-gradient-to-b from-ember-500/30 to-transparent" />
											)}
											<div className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 border ${s.done ? 'bg-ember-500/[0.05] border-ember-500/15' : 'bg-white/[0.02] border-white/[0.05]'}`}>
												<div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${s.done ? 'bg-ember-500/20' : 'bg-white/[0.04]'}`}>
													{s.done
														? <BadgeCheck className="w-3 h-3 text-ember-400" />
														: <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
													}
												</div>
												<div>
													<p className="text-[9px] text-white/30 uppercase tracking-wide">{s.step}</p>
													<p className={`text-xs ${s.done ? 'text-white/60' : 'text-white/30'}`}>{s.label}</p>
												</div>
											</div>
										</motion.div>
									))}
								</div>
							</BentoCard>
						</FadeIn>

						{/* ── AGRC Governance (3 cols) ── */}
						<FadeIn delay={0.15} className="col-span-12 sm:col-span-6 lg:col-span-3">
							<BentoCard className="p-8 min-h-[340px] flex flex-col items-center justify-center text-center">
								{/* Animated risk gauge */}
								<motion.div
									animate={{ scale: [1, 1.04, 1] }}
									transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
									className="relative mb-6"
								>
									<div className="absolute inset-0 rounded-full bg-green-500/10 blur-xl scale-150" />
									<div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/15 to-emerald-500/15 border border-green-500/20 flex items-center justify-center">
										<BadgeCheck className="w-7 h-7 text-green-400/80" />
									</div>
								</motion.div>
								<h3 className="text-lg font-bold text-white mb-2 tracking-tight">
									AI Governance Profiler
								</h3>
								<p className="text-xs text-silver/70 leading-relaxed mb-5">
									AGRC-rated assessments of a company's governance, data practices and shadow IT exposure, at a glance.
								</p>

								{/* Rating badges */}
								<div className="flex flex-col gap-1.5 w-full">
									{[
										{ code: 'GD', tier: 'A', label: 'Gov Disclosure', color: 'green' },
										{ code: 'PD', tier: 'B', label: 'Privacy', color: 'sky' },
										{ code: 'SI', tier: 'C', label: 'Shadow IT', color: 'amber' },
									].map((f, i) => (
										<motion.div
											key={f.code}
											initial={{ opacity: 0, scale: 0.9 }}
											animate={inView ? { opacity: 1, scale: 1 } : {}}
											transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
											className="flex items-center gap-2 rounded-lg bg-white/[0.03] border border-white/[0.05] px-2.5 py-1.5"
										>
											<span className={`text-[9px] font-bold text-${f.color}-400 w-6`}>{f.code}</span>
											<div className={`w-5 h-5 rounded-md bg-${f.color}-500/15 flex items-center justify-center`}>
												<span className={`text-[10px] font-bold text-${f.color}-400`}>{f.tier}</span>
											</div>
											<span className="text-[10px] text-white/30 flex-1 text-left">{f.label}</span>
										</motion.div>
									))}
								</div>
							</BentoCard>
						</FadeIn>
					</div>
				</div>
			</section>
		</ScrollFade>
	);
};

/* ──────────────────────────────────────────────────────────────────────── */
/*  FAQ                                                                     */
/* ──────────────────────────────────────────────────────────────────────── */

const faqs = [
	{
		q: 'How do the AI agents work?',
		a: "Each agent does one job well, like answering email, booking appointments or following up with leads. It works from your business details and the conversation so far. Anything sensitive or out of the ordinary comes to you instead of getting an automatic reply.",
	},
	{
		q: 'Can I use Aries AI alongside the tools I have now?',
		a: "Yes. Import your contacts from a CSV file and run Aries next to your current setup while you get comfortable. Tell us what you use today and we'll help you plan the move.",
	},
	{
		q: 'Which channels does Aries AI support?',
		a: 'Email (Gmail and iCloud), SMS and a chat widget for your website. Every conversation lands in one inbox, so you and your agents always see the same picture.',
	},
	{
		q: 'Is my data secure?',
		a: 'Your data is encrypted in transit and at rest, hosted on Google Cloud and kept separate from every other account.',
	},
	{
		q: 'What happens after the free trial?',
		a: 'After 14 days, choose the plan that fits your business. No contracts and no surprise charges.',
	},
	{
		q: 'Do I need technical knowledge to set it up?',
		a: 'No. Most businesses are up and running within an hour: connect your inbox, import your contacts and switch on your first agent.',
	},
];

const FAQItem = ({ faq, index }: { faq: (typeof faqs)[0]; index: number }) => {
	const [open, setOpen] = useState(false);
	return (
		<FadeIn delay={index * 0.05}>
			<button
				onClick={() => setOpen(!open)}
				className="w-full text-left group"
			>
				<div
					className={`rounded-2xl border transition-all duration-300 ${
						open
							? 'bg-ember-500/[0.04] border-ember-500/15'
							: 'bg-white/[0.01] border-white/[0.06] hover:border-white/[0.1] hover:bg-white/[0.02]'
					}`}
				>
					<div className="flex items-center justify-between p-6">
						<span
							className={`text-base font-medium pr-8 transition-colors duration-200 ${open ? 'text-white' : 'text-white/70 group-hover:text-white/90'}`}
						>
							{faq.q}
						</span>
						<div
							className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
								open
									? 'bg-ember-500/20 rotate-0'
									: 'bg-white/[0.04] group-hover:bg-white/[0.08]'
							}`}
						>
							{open ? (
								<Minus className="w-4 h-4 text-ember-400" />
							) : (
								<Plus className="w-4 h-4 text-white/40 group-hover:text-white/60" />
							)}
						</div>
					</div>
					<AnimatePresence>
						{open && (
							<motion.div
								initial={{ height: 0, opacity: 0 }}
								animate={{ height: 'auto', opacity: 1 }}
								exit={{ height: 0, opacity: 0 }}
								transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
								className="overflow-hidden"
							>
								<div className="px-6 pb-6 pt-0">
									<p className="text-sm text-silver/70 leading-relaxed">
										{faq.a}
									</p>
								</div>
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			</button>
		</FadeIn>
	);
};

const FAQSection = () => (
	<ScrollFade>
		<section className="relative py-32 lg:py-40">
			<div className="absolute inset-0 bg-slate-950" />
			<div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

			<div className="relative z-10 max-w-3xl mx-auto px-6 lg:px-8">
				<FadeIn className="text-center mb-16">
					<p className="text-xs uppercase tracking-[0.2em] text-ember-400/60 font-medium mb-4">
						FAQ
					</p>
					<h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
						<span className="text-white">Questions? </span>
						<span className="bg-gradient-to-r from-ember-400 to-ember-400 bg-clip-text text-transparent">
							Answered.
						</span>
					</h2>
				</FadeIn>

				<div className="space-y-3">
					{faqs.map((faq, i) => (
						<FAQItem
							key={i}
							faq={faq}
							index={i}
						/>
					))}
				</div>
			</div>
		</section>
	</ScrollFade>
);

/* ──────────────────────────────────────────────────────────────────────── */
/*  CTA                                                                     */
/* ──────────────────────────────────────────────────────────────────────── */

const CTASection = () => {
	const ref = useRef(null);
	const inView = useInView(ref, { once: true, margin: '-100px' });

	return (
		<ScrollFade>
			<section
				ref={ref}
				className="relative py-32 lg:py-40 overflow-hidden"
			>
				<div className="absolute inset-0 bg-slate-950" />

				{/* Ambient glow */}
				<motion.div
					animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.25, 0.15] }}
					transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
					className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] rounded-full bg-ember-600/[0.08] blur-[120px]"
				/>
				<motion.div
					animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
					transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
					className="absolute top-20 right-[10%] w-[300px] h-[300px] rounded-full bg-ember-500/[0.06] blur-[80px]"
				/>

				<div className="relative z-10 max-w-4xl mx-auto px-6 lg:px-8">
					<motion.div
						initial={{ opacity: 0, y: 40 }}
						animate={inView ? { opacity: 1, y: 0 } : {}}
						transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
						className="relative"
					>
						{/* CTA card */}
						<div className="relative rounded-3xl border border-white/[0.08] bg-gradient-to-br from-obsidian/40 via-slate-900/40 to-obsidian/40 backdrop-blur-xl overflow-hidden">
							{/* Inner glow at top */}
							<div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-ember-400/30 to-transparent" />
							{/* Grid pattern */}
							<div
								className="absolute inset-0 opacity-[0.03]"
								style={{
									backgroundImage:
										'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
									backgroundSize: '40px 40px',
								}}
							/>

							<div className="relative z-10 px-8 py-16 sm:px-16 sm:py-20 text-center">
								{/* Icon */}
								<motion.div
									initial={{ opacity: 0, scale: 0.8 }}
									animate={inView ? { opacity: 1, scale: 1 } : {}}
									transition={{ delay: 0.2, duration: 0.5 }}
									className="mb-8 inline-flex"
								>
									<AriesMark className="w-16 h-12 text-cream mx-auto mb-8" />
								</motion.div>

								<h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-5 leading-tight">
									<span className="text-white">Ready for a calmer </span>
									<br className="hidden sm:block" />
									<span className="bg-gradient-to-r from-ember-400 via-ember-400 to-ember-400 bg-clip-text text-transparent">
										way to run things
									</span>
								</h2>
								<p className="text-base sm:text-lg text-silver/70 max-w-lg mx-auto mb-10 leading-relaxed">
									See how Aries fits your business in a short demo. No credit card needed.
								</p>

								<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
									<AppLink to="/signup">
										<Button
											size="lg"
											className="bg-gradient-to-r from-ember-600 to-ember-600 hover:from-ember-500 hover:to-ember-500 text-white shadow-2xl shadow-ember-600/25 border-0 px-10 h-13 text-base font-medium group"
										>
											Book a demo
											<ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
										</Button>
									</AppLink>
									<AppLink to="/login">
										<Button
											size="lg"
											variant="ghost"
											className="text-silver hover:text-white hover:bg-white/[0.06] px-8 h-13 text-base"
										>
											Sign in to your account
										</Button>
									</AppLink>
								</div>

								{/* Trust line */}
								<motion.p
									initial={{ opacity: 0 }}
									animate={inView ? { opacity: 1 } : {}}
									transition={{ delay: 0.6 }}
									className="mt-8 text-xs text-ember-300/25"
								>
									Free demo · No credit card · Cancel anytime
								</motion.p>
							</div>
						</div>
					</motion.div>
				</div>
			</section>
		</ScrollFade>
	);
};

/* ──────────────────────────────────────────────────────────────────────── */
/*  Footer                                                                  */
/* ──────────────────────────────────────────────────────────────────────── */

const FooterSection = () => (
	<footer className="relative border-t border-white/[0.06] bg-slate-950">
		<div className="max-w-7xl mx-auto px-6 lg:px-8">
			{/* Main footer */}
			<div className="py-16 lg:py-20 grid grid-cols-2 md:grid-cols-12 gap-10 lg:gap-8">
				{/* Brand column */}
				<div className="col-span-2 md:col-span-4 lg:col-span-5">
					<Link
						to="/"
						className="flex items-center gap-2.5 mb-5"
					>
						<AriesLogo tone="light" markClassName="w-9 h-7" />
					</Link>
					<p className="text-sm text-silver/70 leading-relaxed max-w-xs mb-6">
						The calm, clear system behind your business: AI agents and CRM in one place.
					</p>
					<p className="text-xs text-ember-300/20">
						Planned, approved and launched.
					</p>
				</div>

				{/* Link columns */}
				{[
					{
						title: 'Product',
						links: ['Features', 'Pricing', 'Integrations', 'API', 'Changelog'],
					},
					{
						title: 'Company',
						links: ['About', 'Blog', 'Careers', 'Contact', 'Press'],
					},
					{
						title: 'Resources',
						links: [
							'Documentation',
							'Help Center',
							'Community',
							'Status',
							'Security',
						],
					},
				].map((col) => (
					<div
						key={col.title}
						className="col-span-1 md:col-span-2 lg:col-span-2"
					>
						<h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">
							{col.title}
						</h4>
						<ul className="space-y-2.5">
							{col.links.map((link) => (
								<li key={link}>
									<button className="text-sm text-silver/70 hover:text-white/70 transition-colors duration-200">
										{link}
									</button>
								</li>
							))}
						</ul>
					</div>
				))}
			</div>

			{/* Bottom bar */}
			<div className="border-t border-white/[0.04] py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
				<p className="text-xs text-silver/70">
					&copy; {new Date().getFullYear()} Aries AI. All rights reserved.
				</p>
				<div className="flex items-center gap-6">
					<Link to="/privacy" className="text-xs text-silver/70 hover:text-white/50 transition-colors">Privacy</Link>
					<Link to="/terms" className="text-xs text-silver/70 hover:text-white/50 transition-colors">Terms</Link>
					<button className="text-xs text-silver/70 hover:text-white/50 transition-colors">Cookies</button>
				</div>
			</div>
		</div>
	</footer>
);

export default Landing;
