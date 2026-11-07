import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Check, Copy, Loader2, MessageCircle, Trash2 } from 'lucide-react';

interface WhatsAppAccount {
	id: string;
	identifier: string;
	is_active: boolean;
	config: Record<string, any>;
}

const webhookUrl = (id: string) =>
	`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook?account=${id}`;

function CopyField({ value }: { value: string }) {
	const [copied, setCopied] = useState(false);
	return (
		<div className="flex items-center gap-2">
			<code className="flex-1 min-w-0 truncate text-[11px] bg-muted px-2 py-1.5 rounded font-mono">{value}</code>
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="h-7 px-2 shrink-0"
				onClick={() => {
					navigator.clipboard.writeText(value).then(() => {
						setCopied(true);
						setTimeout(() => setCopied(false), 1500);
					});
				}}
			>
				{copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
			</Button>
		</div>
	);
}

/** Settings > Channels: connect WhatsApp numbers through the customer's own Twilio account. */
export function WhatsAppChannels({ clientId }: { clientId: string }) {
	const [accounts, setAccounts] = useState<WhatsAppAccount[]>([]);
	const [phone, setPhone] = useState('');
	const [sid, setSid] = useState('');
	const [token, setToken] = useState('');
	const [saving, setSaving] = useState(false);
	const [justConnected, setJustConnected] = useState<string | null>(null);

	const load = useCallback(async () => {
		const { data } = await supabase
			.from('channel_accounts')
			.select('id, identifier, is_active, config')
			.eq('client_id', clientId)
			.eq('channel', 'whatsapp')
			.order('created_at');
		setAccounts((data as any) || []);
	}, [clientId]);

	useEffect(() => { load(); }, [load]);

	const connect = async () => {
		setSaving(true);
		try {
			const { data, error } = await supabase.functions.invoke('whatsapp-connect', {
				body: { client_id: clientId, phone, account_sid: sid, auth_token: token },
			});
			const message = data?.error || (error ? (await (error as any).context?.json?.().catch(() => null))?.error || error.message : null);
			if (message) throw new Error(message);
			toast.success(`WhatsApp ${data.identifier} connected`);
			setJustConnected(data.id);
			setPhone(''); setSid(''); setToken('');
			load();
		} catch (e: any) {
			toast.error(e.message || 'Could not connect WhatsApp');
		} finally {
			setSaving(false);
		}
	};

	const remove = async (id: string) => {
		const { error } = await supabase.from('channel_accounts').delete().eq('id', id);
		if (error) toast.error('Could not remove the number');
		else { toast.success('WhatsApp number removed'); load(); }
	};

	return (
		<div className="space-y-4">
			<div>
				<h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
					<MessageCircle className="w-4 h-4 text-emerald-600" />WhatsApp
				</h3>
				<p className="text-xs text-muted-foreground">
					Connect a WhatsApp Business number through your Twilio account. Messages show up in your Inbox, and
					the agent you pick on the <Link to="/agents" className="underline">Agents</Link> page replies to them.
				</p>
			</div>

			{accounts.map((a) => (
				<div key={a.id} className="p-3 rounded-lg border bg-muted/30 space-y-2">
					<div className="flex items-center gap-3">
						<div className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-500/10 text-emerald-600 shrink-0">
							<MessageCircle className="w-4 h-4" />
						</div>
						<div className="flex-1 min-w-0">
							<div className="text-sm font-medium text-foreground">{a.identifier}</div>
							<div className="text-xs text-muted-foreground">
								WhatsApp · Twilio{a.config?.twilio_account_name ? ` (${a.config.twilio_account_name})` : ''} · {a.is_active ? 'Active' : 'Inactive'}
							</div>
						</div>
						<Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => remove(a.id)}>
							<Trash2 className="w-4 h-4" />
						</Button>
					</div>
					<div className="space-y-1">
						<p className="text-[11px] text-muted-foreground">
							{justConnected === a.id ? 'Last step: ' : ''}In Twilio, set "When a message comes in" for this sender to this address (method POST):
						</p>
						<CopyField value={webhookUrl(a.id)} />
					</div>
				</div>
			))}

			<div className="border-t pt-4 space-y-3">
				<Label className="text-sm font-semibold">Connect a WhatsApp number</Label>
				<div className="grid gap-2 sm:grid-cols-3">
					<Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+14155238886" />
					<Input value={sid} onChange={(e) => setSid(e.target.value)} placeholder="Account SID (AC...)" />
					<Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Auth Token" type="password" autoComplete="off" />
				</div>
				<p className="text-[11px] text-muted-foreground leading-relaxed">
					Find the Account SID and Auth Token on your Twilio console home page. The number is your WhatsApp sender
					in Twilio (Messaging → Senders → WhatsApp senders). To try it first, use Twilio's WhatsApp Sandbox
					number (+14155238886).
				</p>
				<Button onClick={connect} disabled={saving || !phone || !sid || !token} className="gap-2">
					{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
					{saving ? 'Checking with Twilio...' : 'Connect WhatsApp'}
				</Button>
			</div>
		</div>
	);
}
