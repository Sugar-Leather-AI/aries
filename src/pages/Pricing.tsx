import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AppLink } from '@/components/AppLink';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
	Check,
	ChevronRight,
	Zap,
	ArrowRight,
	Sparkles,
	Users,
	Bot,
	Mail,
	MessageSquare,
	BarChart3,
	Globe,
	Shield,
	Building2,
	Star,
	Phone,
	Minus,
	Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AriesLogo, AriesMark } from '@/components/brand/AriesLogo';

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

/* ──────────────────────────────────────────────────────────────────────── */
/*  Pricing Data                                                            */
/* ──────────────────────────────────────────────────────────────────────── */

const TrendingUp = ({ className = 'w-5 h-5' }: { className?: string }) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		className={className}
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
		<polyline points="16 7 22 7 22 13" />
	</svg>
);

interface Tier {
	name: string;
	price: { monthly: number; annual: number };
	description: string;
	badge?: string;
	highlighted?: boolean;
	icon: React.ReactNode;
	features: string[];
	limits: {
		contacts: string;
		users: string;
		emails: string;
		sms: string;
		agents: string;
	};
	cta: string;
}

const tiers: Tier[] = [
	{
		name: 'Starter',
		price: { monthly: 49, annual: 39 },
		description:
			'Your contacts, inbox, calendar and pipeline in one calm place.',
		icon: <Zap className="w-5 h-5" />,
		features: [
			'CRM with contact management',
			'Unified inbox (email & SMS)',
			'Calendar & appointment booking',
			'Sales pipeline',
			'Basic reporting dashboard',
			'Lead capture widget',
			'Email support',
		],
		limits: {
			contacts: '500',
			users: '1',
			emails: '500/mo',
			sms: '100/mo',
			agents: '—',
		},
		cta: 'Start free trial',
	},
	{
		name: 'Growth',
		price: { monthly: 149, annual: 119 },
		description:
			'AI agents that answer, follow up and book appointments for you.',
		badge: 'Popular',
		highlighted: true,
		icon: <TrendingUp className="w-5 h-5" />,
		features: [
			'Everything in Starter',
			'2 AI agents (Sales & Support)',
			'Email delivery tracking',
			'Reputation management',
			'Company management',
			'Project boards',
			'Priority email support',
		],
		limits: {
			contacts: '5,000',
			users: '3',
			emails: '5,000/mo',
			sms: '500/mo',
			agents: '2',
		},
		cta: 'Start free trial',
	},
	{
		name: 'Pro',
		price: { monthly: 299, annual: 239 },
		description:
			'Deeper reporting, more agents and team roles for a growing business.',
		icon: <Sparkles className="w-5 h-5" />,
		features: [
			'Everything in Growth',
			'5 AI agents (fully configurable)',
			'Advanced reports & analytics',
			'Third-party integrations',
			'Custom pipelines & workflows',
			'Team roles & permissions',
			'Phone & chat support',
		],
		limits: {
			contacts: '25,000',
			users: '10',
			emails: '25,000/mo',
			sms: '2,500/mo',
			agents: '5',
		},
		cta: 'Start free trial',
	},
	{
		name: 'Agency',
		price: { monthly: 499, annual: 399 },
		description:
			'Run Aries for your clients, under your own brand.',
		icon: <Building2 className="w-5 h-5" />,
		features: [
			'Everything in Pro',
			'Unlimited AI agents',
			'Multi-tenant client management',
			'White-label branding',
			'Agency analytics dashboard',
			'Dedicated account manager',
			'SLA & onboarding support',
		],
		limits: {
			contacts: 'Unlimited',
			users: 'Unlimited',
			emails: '100,000/mo',
			sms: '10,000/mo',
			agents: 'Unlimited',
		},
		cta: 'Contact sales',
	},
];

/* ──────────────────────────────────────────────────────────────────────── */
/*  FAQ                                                                     */
/* ──────────────────────────────────────────────────────────────────────── */

const faqs = [
	{
		q: 'Can I switch plans at any time?',
		a: "Yes. Upgrade or downgrade whenever you like. Changes take effect on your next billing cycle, and an upgrade unlocks its features straight away with a prorated charge.",
	},
	{
		q: 'Is there a free trial?',
		a: "Yes. Every plan starts with a 14-day free trial, with no credit card needed and full access to the features in your plan.",
	},
	{
		q: 'How do AI agents work?',
		a: 'Agents take care of routine work like answering email, qualifying leads and following up. Give each one a name, a tone and instructions for your business. Anything sensitive comes to you.',
	},
	{
		q: 'Do I need to buy a phone number separately?',
		a: "Phone numbers for SMS are provisioned through our Telnyx integration. Numbers cost approximately $1-2/month and are billed separately. We'll help you set it up during onboarding.",
	},
	{
		q: 'What happens if I exceed my limits?',
		a: "You'll receive a notification when approaching your limits. You can upgrade anytime, or purchase additional credits for emails and SMS at competitive rates.",
	},
	{
		q: 'Is my data secure?',
		a: 'Your data is encrypted in transit and at rest, protected by row-level security and kept separate for every account. It is never shared.',
	},
];

const FAQItem = ({ q, a, index }: { q: string; a: string; index: number }) => {
	const [open, setOpen] = useState(false);
	return (
		<FadeIn delay={index * 0.05}>
			<button
				onClick={() => setOpen(!open)}
				className="w-full text-left group"
			>
				<div className="flex items-start justify-between gap-4 py-5 border-b border-white/[0.06]">
					<span className="text-sm sm:text-base text-silver group-hover:text-white transition-colors font-medium">
						{q}
					</span>
					<div className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full border border-white/[0.1] flex items-center justify-center group-hover:border-ember-500/40 transition-colors">
						{open ? (
							<Minus className="w-3.5 h-3.5 text-ember-400" />
						) : (
							<Plus className="w-3.5 h-3.5 text-silver/70" />
						)}
					</div>
				</div>
				<AnimatePresence>
					{open && (
						<motion.div
							initial={{ height: 0, opacity: 0 }}
							animate={{ height: 'auto', opacity: 1 }}
							exit={{ height: 0, opacity: 0 }}
							transition={{ duration: 0.25, ease: 'easeInOut' }}
							className="overflow-hidden"
						>
							<p className="text-sm text-silver/70 pb-5 leading-relaxed pr-10">
								{a}
							</p>
						</motion.div>
					)}
				</AnimatePresence>
			</button>
		</FadeIn>
	);
};

/* ──────────────────────────────────────────────────────────────────────── */
/*  Main Pricing Page                                                       */
/* ──────────────────────────────────────────────────────────────────────── */

const Pricing = () => {
	const [annual, setAnnual] = useState(false);
	const [scrolled, setScrolled] = useState(false);

	useEffect(() => {
		const handler = () => setScrolled(window.scrollY > 20);
		window.addEventListener('scroll', handler, { passive: true });
		return () => window.removeEventListener('scroll', handler);
	}, []);

	return (
		<div
			className="min-h-screen bg-slate-950 text-white overflow-x-hidden"
			
		>
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
						<Link
							to="/"
							className="flex items-center gap-2.5 group"
						>
							<AriesLogo tone="light" markClassName="w-9 h-7" />
						</Link>

						<div className="hidden md:flex items-center gap-1">
							{[
								{ label: 'Product', to: '/#product' },
								{ label: 'Features', to: '/#features' },
								{ label: 'Pricing', to: '/pricing' },
								{ label: 'About', to: '/#about' },
							].map((item) => (
								<Link
									key={item.label}
									to={item.to}
									className={`px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
										item.label === 'Pricing'
											? 'text-white bg-white/[0.06]'
											: 'text-silver hover:text-white hover:bg-white/[0.04]'
									}`}
								>
									{item.label}
								</Link>
							))}
						</div>

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
			<section className="relative pt-32 pb-8 sm:pt-40 sm:pb-12">
				{/* Background */}
				<div className="absolute inset-0">
					<div className="absolute inset-0 bg-gradient-to-b from-obsidian/50 via-slate-950 to-slate-950" />
					<div
						className="absolute inset-0"
						style={{
							backgroundImage:
								'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(204,102,51,0.12) 0%, transparent 60%)',
						}}
					/>
					<div
						className="absolute inset-0 opacity-[0.02]"
						style={{
							backgroundImage:
								'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
							backgroundSize: '80px 80px',
						}}
					/>
				</div>

				{/* Animated orbs */}
				<motion.div
					animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
					transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
					className="absolute top-20 right-[20%] w-[400px] h-[400px] rounded-full bg-ember-600/[0.06] blur-[100px]"
				/>
				<motion.div
					animate={{ y: [0, 15, 0], x: [0, -15, 0] }}
					transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
					className="absolute top-40 left-[10%] w-[300px] h-[300px] rounded-full bg-ember-600/[0.05] blur-[100px]"
				/>

				<div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
					>
						<div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-ember-500/20 bg-ember-500/[0.06] mb-8">
							<Sparkles className="w-3.5 h-3.5 text-ember-400" />
							<span className="text-xs font-medium text-ember-300/80">
								Simple, transparent pricing
							</span>
						</div>
					</motion.div>

					<motion.h1
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.1 }}
						className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6"
					>
						<span className="text-white">Choose the plan that </span>
						<br className="hidden sm:block" />
						<span className="bg-gradient-to-r from-ember-400 via-ember-400 to-ember-400 bg-clip-text text-transparent">
							scales with you
						</span>
					</motion.h1>

					<motion.p
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.2 }}
						className="text-base sm:text-lg text-silver/70 max-w-2xl mx-auto mb-10 leading-relaxed"
					>
						Start free for 14 days. No credit card required. Upgrade, downgrade,
						or cancel anytime.
					</motion.p>

					{/* Billing toggle */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.3 }}
						className="inline-flex items-center gap-3 p-1 rounded-full border border-white/[0.08] bg-white/[0.03]"
					>
						<button
							onClick={() => setAnnual(false)}
							className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
								!annual
									? 'bg-gradient-to-r from-ember-600 to-ember-600 text-white shadow-lg shadow-ember-600/20'
									: 'text-silver/70 hover:text-white'
							}`}
						>
							Monthly
						</button>
						<button
							onClick={() => setAnnual(true)}
							className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
								annual
									? 'bg-gradient-to-r from-ember-600 to-ember-600 text-white shadow-lg shadow-ember-600/20'
									: 'text-silver/70 hover:text-white'
							}`}
						>
							Annual
							<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
								Save 20%
							</span>
						</button>
					</motion.div>
				</div>
			</section>

			{/* ───── Pricing Cards ───── */}
			<section className="relative py-12 sm:py-16">
				<div className="max-w-7xl mx-auto px-6 lg:px-8">
					<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 lg:gap-6">
						{tiers.map((tier, i) => (
							<FadeIn
								key={tier.name}
								delay={i * 0.1}
							>
								<div
									className={`relative h-full rounded-2xl border transition-all duration-300 group ${
										tier.highlighted
											? 'border-ember-500/30 bg-gradient-to-b from-ember-500/[0.08] to-transparent shadow-2xl shadow-ember-500/[0.08]'
											: 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.03]'
									}`}
								>
									{/* Popular badge */}
									{tier.badge && (
										<div className="absolute -top-3 left-1/2 -translate-x-1/2">
											<div className="px-4 py-1 rounded-full bg-gradient-to-r from-ember-600 to-ember-600 text-xs font-semibold text-white shadow-lg shadow-ember-600/25">
												{tier.badge}
											</div>
										</div>
									)}

									<div className="p-6 sm:p-8">
										{/* Header */}
										<div className="flex items-center gap-3 mb-4">
											<div
												className={`w-10 h-10 rounded-xl flex items-center justify-center ${
													tier.highlighted
														? 'bg-gradient-to-br from-ember-500 to-ember-600 shadow-lg shadow-ember-500/25'
														: 'bg-white/[0.06] border border-white/[0.06]'
												}`}
											>
												<span
													className={
														tier.highlighted
															? 'text-white'
															: 'text-ember-300/70'
													}
												>
													{tier.icon}
												</span>
											</div>
											<h3 className="text-lg font-semibold text-white">
												{tier.name}
											</h3>
										</div>

										<p className="text-sm text-silver/70 leading-relaxed mb-6 min-h-[40px]">
											{tier.description}
										</p>

										{/* Price */}
										<div className="mb-6">
											<div className="flex items-baseline gap-1">
												<span className="text-4xl font-bold text-white tracking-tight">
													${annual ? tier.price.annual : tier.price.monthly}
												</span>
												<span className="text-sm text-silver/70">/mo</span>
											</div>
											{annual && (
												<p className="text-xs text-silver/70 mt-1">
													${tier.price.annual * 12}/year · billed annually
												</p>
											)}
										</div>

										{/* CTA */}
										<Link to={tier.name === 'Agency' ? '#' : '/signup'}>
											<Button
												className={`w-full mb-8 h-11 text-sm font-medium transition-all duration-300 ${
													tier.highlighted
														? 'bg-gradient-to-r from-ember-600 to-ember-600 hover:from-ember-500 hover:to-ember-500 text-white shadow-lg shadow-ember-600/20 border-0'
														: 'bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.08] hover:border-white/[0.15]'
												}`}
											>
												{tier.cta}
												<ArrowRight className="w-4 h-4 ml-2" />
											</Button>
										</Link>

										{/* Limits */}
										<div className="grid grid-cols-2 gap-3 mb-6 pb-6 border-b border-white/[0.06]">
											{[
												{
													label: 'Contacts',
													value: tier.limits.contacts,
													icon: <Users className="w-3 h-3" />,
												},
												{
													label: 'Users',
													value: tier.limits.users,
													icon: <Shield className="w-3 h-3" />,
												},
												{
													label: 'Emails',
													value: tier.limits.emails,
													icon: <Mail className="w-3 h-3" />,
												},
												{
													label: 'SMS',
													value: tier.limits.sms,
													icon: <MessageSquare className="w-3 h-3" />,
												},
												{
													label: 'AI Agents',
													value: tier.limits.agents,
													icon: <Bot className="w-3 h-3" />,
												},
											].map((limit) => (
												<div
													key={limit.label}
													className="flex items-center gap-1.5"
												>
													<span className="text-ember-300/30">
														{limit.icon}
													</span>
													<span className="text-xs text-silver/70">
														<span className="text-silver font-medium">
															{limit.value}
														</span>{' '}
														{limit.label !== 'AI Agents' &&
															limit.label.toLowerCase()}
														{limit.label === 'AI Agents' && 'agents'}
													</span>
												</div>
											))}
										</div>

										{/* Features */}
										<ul className="space-y-3">
											{tier.features.map((feature) => (
												<li
													key={feature}
													className="flex items-start gap-2.5"
												>
													<div
														className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
															tier.highlighted
																? 'bg-ember-500/20'
																: 'bg-white/[0.06]'
														}`}
													>
														<Check
															className={`w-2.5 h-2.5 ${
																tier.highlighted
																	? 'text-ember-400'
																	: 'text-ember-300/50'
															}`}
														/>
													</div>
													<span className="text-sm text-silver/70 leading-snug">
														{feature}
													</span>
												</li>
											))}
										</ul>
									</div>
								</div>
							</FadeIn>
						))}
					</div>
				</div>
			</section>

			{/* ───── Comparison Table ───── */}
			<section className="relative py-16 sm:py-24">
				<div className="max-w-5xl mx-auto px-6 lg:px-8">
					<FadeIn>
						<div className="text-center mb-12">
							<h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">
								Compare all features
							</h2>
							<p className="text-sm text-silver/70">
								See exactly what's included in each plan
							</p>
						</div>
					</FadeIn>

					<FadeIn delay={0.1}>
						<div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] overflow-hidden">
							<div className="overflow-x-auto">
								<table className="w-full text-sm">
									<thead>
										<tr className="border-b border-white/[0.06]">
											<th className="text-left py-4 px-6 text-silver/70 font-medium">
												Feature
											</th>
											{tiers.map((t) => (
												<th
													key={t.name}
													className="py-4 px-4 text-center"
												>
													<span
														className={`font-semibold ${t.highlighted ? 'text-ember-400' : 'text-white/80'}`}
													>
														{t.name}
													</span>
												</th>
											))}
										</tr>
									</thead>
									<tbody>
										{[
											{
												feature: 'Contacts',
												values: ['500', '5,000', '25,000', 'Unlimited'],
											},
											{
												feature: 'Team members',
												values: ['1', '3', '10', 'Unlimited'],
											},
											{
												feature: 'AI Agents',
												values: ['—', '2', '5', 'Unlimited'],
											},
											{
												feature: 'Emails / month',
												values: ['500', '5,000', '25,000', '100,000'],
											},
											{
												feature: 'SMS / month',
												values: ['100', '500', '2,500', '10,000'],
											},
											{
												feature: 'CRM & Pipeline',
												values: [true, true, true, true],
											},
											{
												feature: 'Unified Inbox',
												values: [true, true, true, true],
											},
											{
												feature: 'Calendar Booking',
												values: [true, true, true, true],
											},
											{
												feature: 'Delivery Tracking',
												values: [false, true, true, true],
											},
											{
												feature: 'Reputation Mgmt',
												values: [false, true, true, true],
											},
											{
												feature: 'Project Boards',
												values: [false, true, true, true],
											},
											{
												feature: 'Advanced Reports',
												values: [false, false, true, true],
											},
											{
												feature: 'Integrations',
												values: [false, false, true, true],
											},
											{
												feature: 'Multi-tenant',
												values: [false, false, false, true],
											},
											{
												feature: 'White-label',
												values: [false, false, false, true],
											},
											{
												feature: 'Dedicated Manager',
												values: [false, false, false, true],
											},
										].map((row, ri) => (
											<tr
												key={row.feature}
												className={`border-b border-white/[0.04] ${ri % 2 === 0 ? 'bg-white/[0.01]' : ''}`}
											>
												<td className="py-3 px-6 text-silver/70 font-medium">
													{row.feature}
												</td>
												{row.values.map((val, vi) => (
													<td
														key={vi}
														className="py-3 px-4 text-center"
													>
														{typeof val === 'boolean' ? (
															val ? (
																<Check className="w-4 h-4 text-ember-400 mx-auto" />
															) : (
																<span className="text-white/10">—</span>
															)
														) : (
															<span className="text-silver text-xs font-medium">
																{val}
															</span>
														)}
													</td>
												))}
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					</FadeIn>
				</div>
			</section>

			{/* ───── FAQ ───── */}
			<section className="relative py-16 sm:py-24">
				<div className="max-w-3xl mx-auto px-6 lg:px-8">
					<FadeIn>
						<div className="text-center mb-12">
							<h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">
								Frequently asked questions
							</h2>
							<p className="text-sm text-silver/70">
								Everything you need to know about our plans
							</p>
						</div>
					</FadeIn>

					<div>
						{faqs.map((faq, i) => (
							<FAQItem
								key={i}
								q={faq.q}
								a={faq.a}
								index={i}
							/>
						))}
					</div>
				</div>
			</section>

			{/* ───── CTA ───── */}
			<section className="relative py-16 sm:py-24">
				<div className="max-w-4xl mx-auto px-6 lg:px-8">
					<FadeIn>
						<div className="relative rounded-3xl border border-white/[0.06] bg-gradient-to-b from-ember-500/[0.06] to-transparent overflow-hidden">
							<div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_120%,rgba(204,102,51,0.1),transparent)]" />
							<div className="relative z-10 px-8 py-16 sm:px-16 sm:py-20 text-center">
								<AriesMark className="w-16 h-12 text-cream mx-auto mb-8" />

								<h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-5 leading-tight">
									<span className="text-white">Start with one inbox and one agent</span>
									
								</h2>
								<p className="text-base sm:text-lg text-silver/70 max-w-lg mx-auto mb-10 leading-relaxed">
									Add more whenever you are ready. Most businesses are set up within an hour.
								</p>

								<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
									<AppLink to="/signup">
										<Button
											size="lg"
											className="bg-gradient-to-r from-ember-600 to-ember-600 hover:from-ember-500 hover:to-ember-500 text-white shadow-2xl shadow-ember-600/25 border-0 px-10 h-13 text-base font-medium group"
										>
											Start your free trial
											<ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
										</Button>
									</AppLink>
									<Link to="/">
										<Button
											size="lg"
											variant="ghost"
											className="text-silver hover:text-white hover:bg-white/[0.06] px-8 h-13 text-base"
										>
											Learn more
										</Button>
									</Link>
								</div>

								<p className="mt-8 text-xs text-ember-300/25">
									Free trial · No credit card · Cancel anytime
								</p>
							</div>
						</div>
					</FadeIn>
				</div>
			</section>

			{/* ───── Footer ───── */}
			<footer className="relative border-t border-white/[0.06] bg-slate-950">
				<div className="max-w-7xl mx-auto px-6 lg:px-8">
					<div className="py-16 lg:py-20 grid grid-cols-2 md:grid-cols-12 gap-10 lg:gap-8">
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

						{[
							{
								title: 'Product',
								links: [
									'Features',
									'Pricing',
									'Integrations',
									'API',
									'Changelog',
								],
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

					<div className="border-t border-white/[0.04] py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
						<p className="text-xs text-silver/70">
							&copy; {new Date().getFullYear()} Aries AI. All rights reserved.
						</p>
						<div className="flex items-center gap-6">
							{['Privacy', 'Terms', 'Cookies'].map((item) => (
								<button
									key={item}
									className="text-xs text-silver/70 hover:text-white/50 transition-colors"
								>
									{item}
								</button>
							))}
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
};

export default Pricing;
