import { useState, useEffect } from 'react';
import { MARKETING_URL } from '@/lib/domains';
import { Link } from 'react-router-dom';
import { AppLink } from '@/components/AppLink';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandLogo as AriesLogo, BrandMark as AriesMark } from '@/components/brand/BrandLogo';
import { BRAND } from "@/brand";

const Terms = () => {
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
						Terms of Service
					</h1>
					<p className="text-sm text-ember-300/40">
						Effective date: {effectiveDate}
					</p>
				</div>

				<div className="space-y-8 text-sm leading-relaxed text-silver/70 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mt-8 [&_h2]:mb-3 [&_strong]:text-silver">
					<p>
						These Terms of Service ("Terms") govern your access to and use of
						the {appName} platform and services ("Service") provided by{' '}
						{company} ("we", "us", or "our"). By creating an account or using
						the Service, you agree to these Terms.
					</p>

					<h2>1. Eligibility</h2>
					<p>
						You must be at least 18 years old and capable of forming a binding
						contract to use the Service. By using {appName}, you represent that
						you meet these requirements and that all information you provide is
						accurate.
					</p>

					<h2>2. Account Registration</h2>
					<p>
						You are responsible for maintaining the confidentiality of your
						account credentials. You are responsible for all activity that
						occurs under your account. Notify us immediately at{' '}
						<a
							href={`mailto:${contactEmail}`}
							className="text-ember-400 hover:text-ember-300 underline"
						>
							{contactEmail}
						</a>{' '}
						if you suspect unauthorized access.
					</p>

					<h2>3. Description of Service</h2>
					<p>
						{appName} is an AI-powered CRM and business automation platform that
						enables you to manage contacts, deals, messages, invoices,
						appointments, and automated AI agents. The Service includes
						integrations with third-party platforms (Gmail, Google Calendar,
						iCloud, Cal.com) which you may optionally connect.
					</p>

					<h2>4. Acceptable Use</h2>
					<p>You agree not to:</p>
					<ul className="list-disc pl-5 space-y-1">
						<li>
							Use the Service for any unlawful purpose or in violation of
							applicable laws
						</li>
						<li>
							Send unsolicited bulk email (spam) through AI agents or any other
							feature
						</li>
						<li>
							Harass, impersonate, or harm any individual using the platform
						</li>
						<li>
							Attempt to gain unauthorized access to our systems or other users'
							accounts
						</li>
						<li>
							Reverse engineer, decompile, or otherwise attempt to extract
							source code
						</li>
						<li>Use the Service to store or transmit malicious code</li>
						<li>
							Resell or sublicense the Service without our written permission
						</li>
					</ul>

					<h2>5. AI Features and Automated Messaging</h2>
					<p>
						{appName} provides AI-powered features including automated email
						replies, lead scoring, and upsell suggestions.
						<strong> You are responsible</strong> for all messages sent through
						your account, including those generated by AI agents. You must
						ensure that automated communications comply with applicable laws,
						including CAN-SPAM, GDPR, and CASL where applicable. We do not
						guarantee the accuracy or appropriateness of AI-generated content.
					</p>

					<h2>6. Third-Party Integrations</h2>
					<p>
						The Service integrates with third-party platforms (Google, Apple,
						Cal.com, etc.). Your use of these integrations is subject to those
						platforms' own terms of service. We are not responsible for the
						availability, accuracy, or policies of third-party services. You may
						revoke connected account access at any time.
					</p>

					<h2>7. Data and Privacy</h2>
					<p>
						Your use of the Service is also governed by our{' '}
						<Link
							to="/privacy"
							className="text-ember-400 hover:text-ember-300 underline"
						>
							Privacy Policy
						</Link>
						, which is incorporated into these Terms by reference.
					</p>

					<h2>8. Intellectual Property</h2>
					<p>
						The {appName} platform, including its design, software, and content,
						is owned by {company} and protected by intellectual property laws.
						You retain ownership of all data and content you input into the
						Service. You grant us a limited license to use your data solely to
						operate and improve the Service.
					</p>

					<h2>9. Fees and Payment</h2>
					<p>
						Certain features of the Service may require a paid subscription.
						Pricing is displayed at{' '}
						<a
							href={website}
							className="text-ember-400 hover:text-ember-300 underline"
							target="_blank"
							rel="noopener noreferrer"
						>
							{website}
						</a>
						. Fees are billed in advance and are non-refundable except as
						required by law or as stated in our refund policy. We reserve the
						right to change pricing with 30 days' notice.
					</p>

					<h2>10. Termination</h2>
					<p>
						You may cancel your account at any time. We may suspend or terminate
						your account if you violate these Terms, with or without notice.
						Upon termination, your right to use the Service ends and we may
						delete your data after a reasonable grace period.
					</p>

					<h2>11. Disclaimer of Warranties</h2>
					<p>
						THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT
						WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
						LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
						PURPOSE, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE
						WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES.
					</p>

					<h2>12. Limitation of Liability</h2>
					<p>
						TO THE MAXIMUM EXTENT PERMITTED BY LAW, {company.toUpperCase()}{' '}
						SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
						CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA,
						OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL
						LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE THREE
						MONTHS PRECEDING THE CLAIM.
					</p>

					<h2>13. Indemnification</h2>
					<p>
						You agree to indemnify and hold harmless {company} and its officers,
						directors, and employees from any claims, damages, or expenses
						arising from your use of the Service, your violation of these Terms,
						or your violation of any third party's rights.
					</p>

					<h2>14. Governing Law</h2>
					<p>
						These Terms are governed by the laws of the State of Minnesota,
						United States, without regard to conflict of law provisions. Any
						disputes shall be resolved in the courts of Minnesota.
					</p>

					<h2>15. Changes to These Terms</h2>
					<p>
						We may update these Terms from time to time. We will notify you of
						material changes via email or in-app notice. Continued use of the
						Service after changes take effect constitutes acceptance of the
						updated Terms.
					</p>

					<h2>16. Contact</h2>
					<p>
						Questions about these Terms? Contact us:
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
								className="text-xs text-silver/70 hover:text-white/50 transition-colors"
							>
								Privacy
							</Link>
							<Link
								to="/terms"
								className="text-xs text-ember-300/50 hover:text-white/50 transition-colors"
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

export default Terms;
