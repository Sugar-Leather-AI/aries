import { useState, useEffect } from 'react';
import { MARKETING_URL } from '@/lib/domains';
import { Link } from 'react-router-dom';
import { AppLink } from '@/components/AppLink';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandLogo as AriesLogo, BrandMark as AriesMark } from '@/components/brand/BrandLogo';
import { BRAND } from "@/brand";

const Privacy = () => {
	const [scrolled, setScrolled] = useState(false);
	useEffect(() => {
		const handler = () => setScrolled(window.scrollY > 20);
		window.addEventListener('scroll', handler, { passive: true });
		return () => window.removeEventListener('scroll', handler);
	}, []);

	const effectiveDate = 'April 13, 2026';
	const appName = BRAND.name;
	const company = 'Sugar & Leather';
	const contactEmail = 'john@sugarandleather.com';
	const website = MARKETING_URL;

	return (
		<div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
			{/* Nav */}
			<nav
				className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-slate-950/70 backdrop-blur-2xl border-b border-white/[0.06] shadow-2xl shadow-ember-950/20' : 'bg-transparent'}`}
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
									Book Demo <ChevronRight className="w-4 h-4 ml-1" />
								</Button>
							</AppLink>
						</div>
					</div>
				</div>
			</nav>

			{/* Content */}
			<div className="max-w-3xl mx-auto px-6 pt-36 pb-24">
				<div className="mb-10">
					<Link
						to="/"
						className="text-sm text-ember-300/50 hover:text-ember-300 transition-colors"
					>
						← Back to {appName}
					</Link>
					<h1 className="text-3xl font-bold mt-4 mb-2 text-white">
						Privacy Policy
					</h1>
					<p className="text-sm text-ember-300/40">
						Effective date: {effectiveDate}
					</p>
				</div>

				<div className="space-y-8 text-sm leading-relaxed text-silver/70 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mt-8 [&_h2]:mb-3 [&_strong]:text-silver">
					<p>
						{company} ("we", "us", or "our") operates the {appName} platform and
						its associated services ("Service"). This Privacy Policy explains
						how we collect, use, disclose, and safeguard your information when
						you use our Service. Please read it carefully. By using {appName},
						you agree to the practices described here.
					</p>

					<h2>1. Information We Collect</h2>
					<p>
						<strong>Account Information:</strong> When you register, we collect
						your name, email address, business name, and password.
					</p>
					<p>
						<strong>Business Data:</strong> We store data you input into the
						platform — contacts, messages, deals, invoices, calendar events, and
						notes — to provide the Service.
					</p>
					<p>
						<strong>Connected Accounts:</strong> When you connect third-party
						accounts (Google, Gmail, iCloud, Cal.com), we store OAuth tokens and
						account identifiers necessary to read and send messages on your
						behalf. We access only the scopes you explicitly authorize.
					</p>
					<p>
						<strong>Usage Data:</strong> We automatically collect log data
						including your IP address, browser type, pages visited, and
						timestamps to operate and improve the Service.
					</p>
					<p>
						<strong>Cookies:</strong> We use session cookies to keep you signed
						in and preference cookies to remember your settings.
					</p>

					<h2>2. How We Use Your Information</h2>
					<ul className="list-disc pl-5 space-y-1">
						<li>To provide, operate, and maintain the {appName} platform</li>
						<li>
							To send and receive emails and messages on your behalf via
							connected accounts
						</li>
						<li>
							To power AI features (lead scoring, automated replies, upsell
							suggestions) using your business data as context
						</li>
						<li>
							To send transactional notifications (appointment reminders,
							invoice alerts)
						</li>
						<li>To respond to your support requests</li>
						<li>To detect and prevent fraud or abuse</li>
						<li>To comply with legal obligations</li>
					</ul>
					<p>
						We do <strong>not</strong> sell your personal data or business data
						to third parties.
					</p>

					<h2>3. Google API Services — Limited Use Disclosure</h2>
					<p>
						{appName}'s use of information received from Google APIs adheres to
						the{' '}
						<a
							href="https://developers.google.com/terms/api-services-user-data-policy"
							className="text-ember-400 hover:text-ember-300 underline"
							target="_blank"
							rel="noopener noreferrer"
						>
							Google API Services User Data Policy
						</a>
						, including the Limited Use requirements.
					</p>
					<p>Specifically, we use Google OAuth to:</p>
					<ul className="list-disc pl-5 space-y-1">
						<li>Read Gmail messages to display them in your {appName} inbox</li>
						<li>
							Send emails from your Gmail account on your behalf (via AI agents
							you configure)
						</li>
						<li>
							Access Google Calendar events (if connected) to display and manage
							appointments
						</li>
					</ul>
					<p>
						Data obtained from Google APIs is used <strong>only</strong> to
						provide the features you explicitly enable. We do not use Google
						user data to train AI models, serve advertising, or share it with
						third parties except as necessary to operate the Service (e.g.,
						sending data to Google's own APIs).
					</p>

					<h2>4. AI Processing</h2>
					<p>
						Some features use Anthropic's Claude API to write email replies,
						score leads, and suggest opportunities, and OpenAI's API to create
						images for social posts. Message content and contact data may be
						sent to these providers for this purpose. Their data handling is
						governed by{' '}
						<a
							href="https://www.anthropic.com/legal/commercial-terms"
							className="text-ember-400 hover:text-ember-300 underline"
							target="_blank"
							rel="noopener noreferrer"
						>
							Anthropic's Commercial Terms
						</a>
						{' '}and{' '}
						<a
							href="https://openai.com/policies/business-terms"
							className="text-ember-400 hover:text-ember-300 underline"
							target="_blank"
							rel="noopener noreferrer"
						>
							OpenAI's Business Terms
						</a>
						. We do not use your data to fine-tune or train AI models.
					</p>

					<h2>5. Data Sharing and Disclosure</h2>
					<p>We share your data only in the following circumstances:</p>
					<ul className="list-disc pl-5 space-y-1">
						<li>
							<strong>Service providers:</strong> Supabase (database/auth),
							Google (Gmail/Calendar APIs), Cal.com (scheduling). Each is bound
							by their own data processing agreements.
						</li>
						<li>
							<strong>Legal requirements:</strong> If required by law, court
							order, or government authority.
						</li>
						<li>
							<strong>Business transfer:</strong> In the event of a merger or
							acquisition, your data may transfer to the successor entity.
						</li>
					</ul>

					<h2>6. Data Retention</h2>
					<p>
						We retain your account data for as long as your account is active.
						You may request deletion of your account and associated data at any
						time by emailing{' '}
						<a
							href={`mailto:${contactEmail}`}
							className="text-ember-400 hover:text-ember-300 underline"
						>
							{contactEmail}
						</a>
						. Some data may be retained as required by law.
					</p>

					<h2>7. Security</h2>
					<p>
						We implement industry-standard security measures including TLS
						encryption in transit, encrypted storage of credentials, and
						row-level security on all database tables. However, no system is
						100% secure and we cannot guarantee absolute security.
					</p>

					<h2>8. Your Rights</h2>
					<p>Depending on your location, you may have the right to:</p>
					<ul className="list-disc pl-5 space-y-1">
						<li>Access the personal data we hold about you</li>
						<li>Correct inaccurate data</li>
						<li>Request deletion of your data</li>
						<li>Withdraw consent for data processing</li>
						<li>
							Revoke connected account access (Google, iCloud) at any time via
							your Google Account settings or Apple ID settings
						</li>
					</ul>
					<p>
						To exercise these rights, contact us at{' '}
						<a
							href={`mailto:${contactEmail}`}
							className="text-ember-400 hover:text-ember-300 underline"
						>
							{contactEmail}
						</a>
						.
					</p>

					<h2>9. Children's Privacy</h2>
					<p>
						{appName} is not directed to individuals under 18. We do not
						knowingly collect personal information from children.
					</p>

					<h2>10. Changes to This Policy</h2>
					<p>
						We may update this Privacy Policy from time to time. We will notify
						you of material changes by email or via an in-app notice. Continued
						use of the Service after the effective date constitutes acceptance
						of the updated policy.
					</p>

					<h2>11. Contact Us</h2>
					<p>
						If you have questions about this Privacy Policy, contact us at:
						<br />
						<strong>{company}</strong>
						<br />
						<a
							href={`mailto:${contactEmail}`}
							className="text-ember-400 hover:text-ember-300 underline"
						>
							{contactEmail}
						</a>
						<br />
						<a
							href={website}
							className="text-ember-400 hover:text-ember-300 underline"
							target="_blank"
							rel="noopener noreferrer"
						>
							{website}
						</a>
					</p>
				</div>
			</div>

			{/* Footer */}
			<footer className="border-t border-white/[0.06] bg-slate-950">
				<div className="max-w-7xl mx-auto px-6 lg:px-8">
					<div className="py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
						<p className="text-xs text-silver/70">
							&copy; {new Date().getFullYear()} {BRAND.name}. All rights reserved.
						</p>
						<div className="flex items-center gap-6">
							<Link
								to="/privacy"
								className="text-xs text-ember-300/50 hover:text-white/50 transition-colors"
							>
								Privacy
							</Link>
							<Link
								to="/terms"
								className="text-xs text-silver/70 hover:text-white/50 transition-colors"
							>
								Terms
							</Link>
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
};

export default Privacy;
