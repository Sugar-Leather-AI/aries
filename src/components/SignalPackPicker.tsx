import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { SIGNAL_PACKS, SIGNAL_TYPES, WEIGHT_LEVELS, packById } from '../../supabase/functions/_shared/signal-packs.ts';

/** Nearest Off/Low/Normal/High level for a weight. */
const level = (w: number) => WEIGHT_LEVELS.reduce((a, b) => (Math.abs(b.value - w) < Math.abs(a.value - w) ? b : a)).value;

/**
 * Lead Prospector: pick the signal pack for your kind of business, then turn
 * any signal up, down or off. `weights` holds only the changes from the pack.
 */
export default function SignalPackPicker({ pack, weights, onChange }: {
	pack: string;
	weights: Record<string, number>;
	onChange: (pack: string, weights: Record<string, number>) => void;
}) {
	const [open, setOpen] = useState(Object.keys(weights).length > 0);
	const current = packById(pack);
	const value = (id: string) => level(weights[id] ?? current.weights[id as keyof typeof current.weights] ?? 1);
	const changed = Object.keys(weights).length;

	const setWeight = (id: string, w: number) => {
		const next = { ...weights };
		const packW = current.weights[id as keyof typeof current.weights] ?? 1;
		if (level(packW) === w) delete next[id]; else next[id] = w;
		onChange(pack, next);
	};

	return (
		<div className="space-y-3">
			<div>
				<Label className="text-sm font-semibold">Signal pack</Label>
				<p className="text-xs text-muted-foreground mt-0.5">Which buying signals matter most for what you sell. Sets the searches and how much each signal counts.</p>
			</div>
			<div className="grid gap-2 sm:grid-cols-2">
				{SIGNAL_PACKS.map((p) => (
					<button key={p.id} type="button" onClick={() => onChange(p.id, {})}
						className={cn('text-left rounded-lg border p-3 transition-colors', p.id === current.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50')}>
						<div className="text-sm font-medium text-foreground">{p.name}</div>
						<div className="text-[11px] text-muted-foreground mt-0.5">{p.description}</div>
					</button>
				))}
			</div>

			<button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-1 text-xs font-medium text-foreground">
				{open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
				Fine-tune signals{changed ? ` (${changed} changed)` : ''}
			</button>
			{open && (
				<div className="rounded-lg border divide-y">
					{SIGNAL_TYPES.map((t) => (
						<div key={t.id} className="flex flex-wrap items-center justify-between gap-2 p-2.5">
							<div className="min-w-0">
								<div className="text-xs font-medium text-foreground">{t.name}{weights[t.id] != null && <span className="ml-1 text-primary">•</span>}</div>
								<div className="text-[11px] text-muted-foreground">{t.hint}</div>
							</div>
							<div className="flex rounded-full bg-muted p-0.5">
								{WEIGHT_LEVELS.map((l) => (
									<button key={l.label} type="button" onClick={() => setWeight(t.id, l.value)}
										className={cn('px-2 py-0.5 text-[11px] rounded-full', value(t.id) === l.value ? 'bg-background shadow-sm font-medium text-foreground' : 'text-muted-foreground')}>
										{l.label}
									</button>
								))}
							</div>
						</div>
					))}
					{changed > 0 && (
						<div className="p-2 text-right">
							<Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onChange(pack, {})}>Reset to {current.name}</Button>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
