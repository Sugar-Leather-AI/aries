import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { BrandLogo as AriesLogo, BrandMark as AriesMark } from '@/components/brand/BrandLogo';

const Login = () => {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const { login, isAuthenticated, user } = useAuth();
	const navigate = useNavigate();

	useEffect(() => {
		if (isAuthenticated && user) {
			navigate(user.role === 'agency_owner' ? '/agency' : '/dashboard', {
				replace: true,
			});
		}
	}, [isAuthenticated, user, navigate]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		try {
			await login(email, password);
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
				{/* Background gradient */}
				<div className="absolute inset-0 bg-gradient-to-br from-obsidian via-obsidian to-slate-950" />
				{/* Animated mesh pattern */}
				<div className="absolute inset-0 opacity-30">
					<div
						className="absolute top-0 left-0 w-full h-full"
						style={{
							backgroundImage:
								'radial-gradient(circle at 25% 25%, rgba(204,102,51,0.3) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(204,102,51,0.3) 0%, transparent 50%), radial-gradient(circle at 50% 10%, rgba(204,102,51,0.2) 0%, transparent 40%)',
						}}
					/>
				</div>
				{/* Decorative floating orbs */}
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
				<motion.div
					animate={{ y: [0, -10, 0] }}
					transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
					className="absolute top-1/2 left-1/2 w-40 h-40 rounded-full bg-ember-400/10 blur-2xl"
				/>
				{/* Grid lines */}
				<div
					className="absolute inset-0 opacity-[0.03]"
					style={{
						backgroundImage:
							'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
						backgroundSize: '60px 60px',
					}}
				/>

				{/* Content */}
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
							Pick up right
							<br />
							where you left off
						</h1>
						<p className="text-lg text-silver leading-relaxed">
							Your inbox, pipeline and calendar are where you left them, and your agents have kept things moving.
						</p>
						{/* Feature highlights */}
						<div className="mt-10 grid grid-cols-2 gap-3">
							{[
								{
									icon: 'M13 10V3L4 14h7v7l9-11h-7z',
									label: 'AI Agents',
									desc: 'Working around the clock',
								},
								{
									icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
									label: 'Unified CRM',
									desc: 'Everything in one place',
								},
								{
									icon: 'M22 12h-4l-3 9L9 3l-3 9H2',
									label: 'Smart Pipeline',
									desc: 'Nothing slips through',
								},
								{
									icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
									label: 'One inbox',
									desc: 'Email, SMS and chat',
								},
							].map((f) => (
								<div
									key={f.label}
									className="bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] rounded-xl px-4 py-3 group hover:bg-white/[0.07] transition-colors"
								>
									<svg
										viewBox="0 0 24 24"
										fill="none"
										className="w-4 h-4 text-ember-400 mb-2"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									>
										<path d={f.icon} />
									</svg>
									<div className="text-sm font-medium text-white">
										{f.label}
									</div>
									<div className="text-xs text-ember-300/50">{f.desc}</div>
								</div>
							))}
						</div>
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

			{/* Right — Login form */}
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
						Welcome back
					</h2>
					<p className="text-muted-foreground mb-8">
						Sign in to your account to continue
					</p>

					<form
						onSubmit={handleSubmit}
						className="space-y-4"
					>
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
							<div className="flex justify-between items-center">
								<Label htmlFor="password">Password</Label>
								<Link
									to="/forgot-password"
									className="text-sm text-ember-600 hover:text-ember-700 hover:underline"
								>
									Forgot password?
								</Link>
							</div>
							<div className="relative mt-1.5">
								<Input
									id="password"
									type={showPassword ? 'text' : 'password'}
									placeholder="••••••••"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
								>
									{showPassword ? (
										<EyeOff className="w-4 h-4" />
									) : (
										<Eye className="w-4 h-4" />
									)}
								</button>
							</div>
						</div>
						<Button
							type="submit"
							className="w-full bg-gradient-to-r from-ember-600 to-ember-600 hover:from-ember-700 hover:to-ember-700 text-white shadow-lg shadow-ember-500/25"
							disabled={loading}
						>
							{loading ? 'Signing in...' : 'Sign in'}
						</Button>
					</form>

					{/* <div className="mt-6 p-4 rounded-lg bg-muted">
            <p className="text-sm font-medium text-foreground mb-2">Demo Credentials</p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Agency Owner:</strong> agency@demo.com / demo123</p>
              <p><strong>Client:</strong> client@demo.com / demo123</p>
            </div>
          </div> */}

					<p className="mt-6 text-center text-sm text-muted-foreground">
						Don't have an account?{' '}
						<Link
							to="/signup"
							className="text-ember-600 hover:text-ember-700 hover:underline font-medium"
						>
							Sign up
						</Link>
					</p>
				</motion.div>
			</div>
		</div>
	);
};

export default Login;
