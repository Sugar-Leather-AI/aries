import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { BrandLogo as AriesLogo, BrandMark as AriesMark } from '@/components/brand/BrandLogo';
import { BRAND } from "@/brand";

const Signup = () => {
	const [fullName, setFullName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const { signup } = useAuth();
	const navigate = useNavigate();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (password.length < 6) {
			toast.error('Password must be at least 6 characters');
			return;
		}
		setLoading(true);
		try {
			await signup(email, password, fullName);
			navigate('/dashboard');
		} catch (err: any) {
			toast.error(err.message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex min-h-screen">
			{/* Left — Brand panel */}
			<div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
				<div className="absolute inset-0 bg-gradient-to-br from-obsidian via-obsidian to-slate-950" />
				<div className="absolute inset-0 opacity-30">
					<div
						className="absolute top-0 left-0 w-full h-full"
						style={{
							backgroundImage:
								'radial-gradient(circle at 25% 25%, rgba(204,102,51,0.3) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(204,102,51,0.3) 0%, transparent 50%), radial-gradient(circle at 50% 10%, rgba(204,102,51,0.2) 0%, transparent 40%)',
						}}
					/>
				</div>
				<motion.div
					animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
					transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
					className="absolute top-20 right-20 w-64 h-64 rounded-full bg-ember-500/10 blur-3xl"
				/>
				<motion.div
					animate={{ y: [0, 15, 0], x: [0, -15, 0] }}
					transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
					className="absolute bottom-32 left-16 w-80 h-80 rounded-full bg-ember-500/10 blur-3xl"
				/>
				<div
					className="absolute inset-0 opacity-[0.03]"
					style={{
						backgroundImage:
							'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
						backgroundSize: '60px 60px',
					}}
				/>

				<div className="relative z-10 flex flex-col justify-between p-12 w-full">
					<motion.div
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5 }}
					>
						<div className="flex items-center gap-3">
							<AriesLogo tone="light" markClassName="w-9 h-7" />
						</div>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, y: 30 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.7, delay: 0.15 }}
						className="max-w-md"
					>
						<h1 className="text-4xl xl:text-5xl font-bold text-white mb-5 leading-[1.15] tracking-tight">
							From scattered
							<br />
							to in control
						</h1>
						<p className="text-lg text-silver leading-relaxed">
							Businesses rarely fail because the idea is bad. They fail because the system never arrived. {BRAND.name} is that system: one calm place for your customers, your pipeline and the agents that keep it all moving.
						</p>
					</motion.div>

					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.5, delay: 0.4 }}
					>
						<p className="text-xs text-ember-400/40">
							Planned, approved and launched.
						</p>
					</motion.div>
				</div>
			</div>

			{/* Right — Signup form */}
			<div className="flex-1 flex items-center justify-center p-8 bg-background">
				<motion.div
					initial={{ opacity: 0, x: 20 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ duration: 0.4 }}
					className="w-full max-w-md"
				>
					<div className="flex items-center gap-3 mb-2 lg:hidden">
						<AriesLogo tone="dark" markClassName="w-9 h-7" />
					</div>
					<h2 className="text-2xl font-bold text-foreground mb-1">
						Create your account
					</h2>
					<p className="text-muted-foreground mb-8">Start your 14-day free trial</p>

					<form
						onSubmit={handleSubmit}
						className="space-y-4"
					>
						<div>
							<Label htmlFor="name">Full name</Label>
							<Input
								id="name"
								placeholder="John Smith"
								value={fullName}
								onChange={(e) => setFullName(e.target.value)}
								required
								className="mt-1.5"
							/>
						</div>
						<div>
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								placeholder="you@example.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								className="mt-1.5"
							/>
						</div>
						<div>
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								type="password"
								placeholder="Min 6 characters"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								className="mt-1.5"
							/>
						</div>
						<Button
							type="submit"
							className="w-full bg-gradient-to-r from-ember-600 to-ember-600 hover:from-ember-700 hover:to-ember-700 text-white shadow-lg shadow-ember-500/25"
							disabled={loading}
						>
							{loading ? 'Creating account...' : 'Create account'}
						</Button>
					</form>

					<p className="mt-6 text-center text-sm text-muted-foreground">
						Already have an account?{' '}
						<Link
							to="/login"
							className="text-ember-600 hover:text-ember-700 hover:underline font-medium"
						>
							Sign in
						</Link>
					</p>
				</motion.div>
			</div>
		</div>
	);
};

export default Signup;
