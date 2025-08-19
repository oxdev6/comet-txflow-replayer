import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
// @ts-ignore - token map from root
import tokenMap from '../../lib/tokenMapData.cjs';

type Tx = {
  txHash: string;
  block: number;
  timestamp: string | number;
  from: string;
  to: string;
  gasUsed: string | number;
  status: number;
  function?: string;
  args?: string[];
  valueEth?: string;
  transfers?: { from: string; to: string; value: string | number; token: string }[];
  logs?: Array<{
    address: string;
    topics?: string[];
    data?: string;
    decoded?: { name: string; args?: Record<string, unknown> };
  }>;
};

type Accent = 'indigo' | 'cyan' | 'purple' | 'emerald' | 'amber' | 'rose';

function fieldAccentClasses(variant: Accent) {
  switch (variant) {
    case 'indigo':
      return {
        container: 'border-l-4 border-indigo-500/70 hover:border-indigo-400/60 focus-within:ring-indigo-500/30',
        label: 'text-indigo-300',
      };
    case 'cyan':
      return {
        container: 'border-l-4 border-cyan-500/70 hover:border-cyan-400/60 focus-within:ring-cyan-500/30',
        label: 'text-cyan-300',
      };
    case 'purple':
      return {
        container: 'border-l-4 border-purple-500/70 hover:border-purple-400/60 focus-within:ring-purple-500/30',
        label: 'text-purple-300',
      };
    
    case 'emerald':

      return {
        container: 'border-l-4 border-emerald-500/70 hover:border-emerald-400/60 focus-within:ring-emerald-500/30',
        label: 'text-emerald-300',
      };
    case 'amber':
      return {
        container: 'border-l-4 border-amber-500/70 hover:border-amber-400/60 focus-within:ring-amber-500/30',
        label: 'text-amber-300',
      };
    case 'rose':
      return {
        container: 'border-l-4 border-rose-500/70 hover:border-rose-400/60 focus-within:ring-rose-500/30',
        label: 'text-rose-300',
      };
  }
}

function buttonAccentClasses(variant: Accent) {
  switch (variant) {
    case 'indigo':
      return 'from-indigo-900 to-black hover:from-indigo-800 hover:to-gray-900 ring-indigo-500/20';
    case 'cyan':
      return 'from-cyan-900 to-black hover:from-cyan-800 hover:to-gray-900 ring-cyan-500/20';
    case 'purple':
      return 'from-purple-900 to-black hover:from-purple-800 hover:to-gray-900 ring-purple-500/20';
    case 'emerald':
      return 'from-emerald-900 to-black hover:from-emerald-800 hover:to-gray-900 ring-emerald-500/20';
    case 'amber':
      return 'from-amber-900 to-black hover:from-amber-800 hover:to-gray-900 ring-amber-500/20';
    case 'rose':
      return 'from-rose-900 to-black hover:from-rose-800 hover:to-gray-900 ring-rose-500/20';
  }
}

function inputRingClasses(variant: Accent) {
  switch (variant) {
    case 'indigo':
      return 'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500';
    case 'cyan':
      return 'focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500';
    case 'purple':
      return 'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500';
    case 'emerald':
      return 'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';
    case 'amber':
      return 'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500';
    case 'rose':
      return 'focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500';
  }
}

export default function Home() {
  const router = useRouter();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<string>('');
  const [fromSelect, setFromSelect] = useState<string>('all');
  const [toSelect, setToSelect] = useState<string>('all');
  const [funcFilter, setFuncFilter] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [intervalSec, setIntervalSec] = useState<number>(10);
  const [groupBy, setGroupBy] = useState<'none' | 'from' | 'to'>('none');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sortKey, setSortKey] = useState<'timestamp' | 'gas' | 'status' | 'function' | 'block'>('timestamp');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [visibleCount, setVisibleCount] = useState<number>(50);
  const [allOpen, setAllOpen] = useState<boolean>(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/transactions?limit=100');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setTxs(Array.isArray(data) ? data : []);
      } catch (e: any) {
        setError(e.message || 'Failed to load');
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const fetchData = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/transactions?limit=100');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setTxs(Array.isArray(data) ? data : []);
      } catch {}
    };
    const id = setInterval(fetchData, Math.max(2, intervalSec) * 1000);
    return () => clearInterval(id);
  }, [autoRefresh, intervalSec]);

  // Hydrate state from URL params on first render
  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query;
    if (typeof q.q === 'string') setQuery(q.q);
    if (typeof q.from === 'string') setFromSelect(q.from);
    if (typeof q.to === 'string') setToSelect(q.to);
    if (typeof q.func === 'string') setFuncFilter(q.func);
    if (typeof q.group === 'string' && (q.group === 'none' || q.group === 'from' || q.group === 'to')) setGroupBy(q.group);
    if (typeof q.sortKey === 'string' && ['timestamp','gas','status','function','block'].includes(q.sortKey)) setSortKey(q.sortKey as any);
    if (typeof q.sortDir === 'string' && (q.sortDir === 'asc' || q.sortDir === 'desc')) setSortDir(q.sortDir);
    if (typeof q.auto === 'string') setAutoRefresh(q.auto === '1');
    if (typeof q.iv === 'string' && !Number.isNaN(Number(q.iv))) setIntervalSec(Number(q.iv));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  // Push current filters to URL (shallow)
  useEffect(() => {
    const params: Record<string, string> = {};
    if (query) params.q = query;
    if (fromSelect !== 'all') params.from = fromSelect;
    if (toSelect !== 'all') params.to = toSelect;
    if (funcFilter !== 'all') params.func = funcFilter;
    if (groupBy !== 'none') params.group = groupBy;
    if (sortKey !== 'timestamp') params.sortKey = sortKey;
    if (sortDir !== 'desc') params.sortDir = sortDir;
    if (autoRefresh) params.auto = '1';
    if (intervalSec !== 10) params.iv = String(intervalSec);
    router.replace({ pathname: router.pathname, query: params }, undefined, { shallow: true });
  }, [query, fromSelect, toSelect, funcFilter, groupBy, sortKey, sortDir, autoRefresh, intervalSec]);

  const functionOptions = useMemo(() => {
    const set = new Set<string>();
    txs.forEach(t => { if (t.function) set.add(t.function); });
    return ['all', ...Array.from(set).sort()];
  }, [txs]);

  const fromOptions = useMemo(() => {
    const set = new Set<string>();
    txs.forEach(t => { if (t.from) set.add(t.from); });
    return ['all', ...Array.from(set).sort()];
  }, [txs]);

  const toOptions = useMemo(() => {
    const set = new Set<string>();
    txs.forEach(t => { if (t.to) set.add(t.to); });
    return ['all', ...Array.from(set).sort()];
  }, [txs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return txs.filter(tx => {
      const fromOk = fromSelect === 'all' || tx.from === fromSelect;
      const toOk = toSelect === 'all' || tx.to === toSelect;
      const funcOk = funcFilter === 'all' || (tx.function || '') === funcFilter;
      const searchOk = !q || `${tx.txHash} ${tx.from} ${tx.to} ${tx.function || ''}`.toLowerCase().includes(q);
      return fromOk && toOk && funcOk && searchOk;
    });
  }, [txs, query, fromSelect, toSelect, funcFilter]);

  const filteredSorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let av: number | string = 0;
      let bv: number | string = 0;
      if (sortKey === 'timestamp') {
        av = new Date(a.timestamp as any).getTime();
        bv = new Date(b.timestamp as any).getTime();
      } else if (sortKey === 'gas') {
        av = Number(a.gasUsed || 0);
        bv = Number(b.gasUsed || 0);
      } else if (sortKey === 'status') {
        av = Number(a.status || 0);
        bv = Number(b.status || 0);
      } else if (sortKey === 'function') {
        av = a.function || '';
        bv = b.function || '';
        return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
      } else if (sortKey === 'block') {
        av = Number(a.block || 0);
        bv = Number(b.block || 0);
      }
      return sortDir === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av);
    });
    return list;
  }, [filtered, sortKey, sortDir]);

  const gasStats = useMemo(() => {
    const arr = filteredSorted.map(t => Number(t.gasUsed || 0)).filter(n => n > 0).sort((a, b) => a - b);
    if (arr.length === 0) return { median: 0, mad: 0, highGasSet: new Set<string>() };
    const median = arr[Math.floor(arr.length / 2)];
    const deviations = arr.map(v => Math.abs(v - median));
    const mad = deviations.sort((a, b) => a - b)[Math.floor(deviations.length / 2)] || 0;
    const thresh = median + 3 * mad;
    const highGasSet = new Set(filteredSorted.filter(t => Number(t.gasUsed || 0) > thresh).map(t => t.txHash));
    return { median, mad, highGasSet } as { median: number; mad: number; highGasSet: Set<string> };
  }, [filteredSorted]);

  const classify = (fn?:string):string=>{
    if(!fn) return 'other';
    const name=fn.toLowerCase();
    if(name.includes('supply')) return 'supply';
    if(name.includes('withdraw')) return 'withdraw';
    if(name.includes('repay')) return 'repay';
    if(name.includes('liquid')) return 'liquidate';
    return 'other';
  };

  const grouped = useMemo(() => {
    if (groupBy === 'none') return { '__all__': filteredSorted } as Record<string, Tx[]>;
    const map: Record<string, Tx[]> = {};
    for (const tx of filteredSorted) {
      const key = groupBy === 'from' ? (tx.from || 'unknown') : (tx.to || 'unknown');
      if (!map[key]) map[key] = [];
      map[key].push(tx);
    }
    return map;
  }, [filteredSorted, groupBy]);

  const toggleExpand = (hash: string) => setExpanded(prev => ({ ...prev, [hash]: !prev[hash] }));
  const toggleAllDetails = () => {
    const next = !allOpen;
    setAllOpen(next);
    const map: Record<string, boolean> = {};
    filteredSorted.forEach(tx => { map[tx.txHash] = next; });
    setExpanded(map);
  };

  const exportCsv = () => {
    const rows = [
      ['txHash','block','timestamp','from','to','gasUsed','status','function','valueEth','args'],
      ...filtered.map(tx => [
        tx.txHash,
        String(tx.block ?? ''),
        new Date(tx.timestamp as any).toISOString(),
        tx.from ?? '',
        tx.to ?? '',
        String(tx.gasUsed ?? ''),
        String(tx.status ?? ''),
        tx.function ?? '',
        tx.valueEth ?? '',
        tx.args ? JSON.stringify(tx.args) : ''
      ])
    ];
    const csv = rows.map(r => r.map(cell => {
      const s = String(cell ?? '');
      return /[,"]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
    }).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportGroupedCsv = () => {
    const rows: string[][] = [[
      'group','txHash','block','timestamp','from','to','gasUsed','status','function','valueEth','args'
    ]];
    const entries = Object.entries(grouped);
    for (const [group, list] of entries) {
      for (const tx of list) {
        rows.push([
          group === '__all__' ? '' : group,
          tx.txHash,
          String(tx.block ?? ''),
          new Date(tx.timestamp as any).toISOString(),
          tx.from ?? '',
          tx.to ?? '',
          String(tx.gasUsed ?? ''),
          String(tx.status ?? ''),
          tx.function ?? '',
          tx.valueEth ?? '',
          tx.args ? JSON.stringify(tx.args) : ''
        ]);
      }
    }
    const csv = rows.map(r => r.map(cell => {
      const s = String(cell ?? '');
      return /[,"]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
    }).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_grouped_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatTimeAgo = (ts: string | number) => {
    try {
      const d = new Date(ts as any).getTime();
      const diff = Math.floor((Date.now() - d) / 1000);
      const units: [number, Intl.RelativeTimeFormatUnit][] = [
        [60, 'second'],
        [60, 'minute'],
        [24, 'hour'],
        [7, 'day'],
        [4.345, 'week'],
        [12, 'month'],
      ];
      let value = diff;
      let unit: Intl.RelativeTimeFormatUnit = 'second';
      for (let i = 0; i < units.length; i++) {
        const [step, u] = units[i];
        if (value < step) { unit = u; break; }
        value = Math.floor(value / step);
        unit = u;
      }
      const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
      return rtf.format(-value, unit);
    } catch { return ''; }
  };

  const ensCache = new Map<string,string>();
  const resolveEns = async (addr:string):Promise<string|null> => {
    if(!addr) return null;
    if(ensCache.has(addr)) return ensCache.get(addr) as string;
    try {
      const res = await fetch(`https://api.ensideas.com/ens/resolve/${addr}`);
      if(res.ok){
        const j= await res.json();
        if(j?.name){ ensCache.set(addr,j.name); return j.name; }
      }
    }catch{}
    ensCache.set(addr,addr);
    return null;
  };

  const tokenSym = (addr:string)=>{
    const entry = (tokenMap as any)[addr?.toLowerCase?.()];
    return entry?.symbol || null;
  };

  const [ensMap,setEnsMap] = useState<Record<string,string>>({});
  useEffect(()=>{
    const addrs = Array.from(new Set(filteredSorted.flatMap(t=>[t.from,t.to].filter(Boolean))));
    addrs.forEach(a=>{
      if(!ensMap[a!]) resolveEns(a!).then(name=>{ if(name) setEnsMap(m=>({...m,[a!]:name})); });
    });
  },[filteredSorted]);

  const displayAddress = (addr?:string)=>{
    if(!addr) return '';
    const ens = ensMap[addr];
    if(ens) return ens;
    return addr.slice(0,6)+'…'+addr.slice(-4);
  };

  const copyToClipboard = async (text: string) => {
    try { await navigator.clipboard.writeText(text); } catch {}
  };

  return (
    <main className="min-h-screen w-screen bg-black text-gray-100 p-6 overflow-x-hidden">
      <h1 className="text-2xl font-bold mb-4">📊 Comet TxFlow Replayer Dashboard</h1>
      {error && <p className="text-red-600">Error: {error}</p>}

      {/* Charts */}
      <Charts txs={filteredSorted} />

      <div className="rounded-2xl border border-gray-800 bg-gradient-to-b from-gray-950 to-black p-3 mb-6">
        <div className="w-full overflow-x-auto whitespace-nowrap flex items-stretch gap-4 pb-1">
        <CardField label="Search" variant="indigo">
          <input
            className={`h-12 px-4 text-base rounded-md border border-gray-700 bg-gray-800 text-gray-100 w-full ${inputRingClasses('indigo')}`}
            placeholder="Search (hash/from/to/function)"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </CardField>

        <CardField label="From" variant="cyan">
          <select
            className={`h-12 px-3 text-base rounded-md border border-gray-700 bg-gray-800 text-gray-100 w-full ${inputRingClasses('cyan')}`}
            value={fromSelect}
            onChange={e => setFromSelect(e.target.value)}
          >
            {fromOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </CardField>

        <CardField label="To" variant="purple">
          <select
            className={`h-12 px-3 text-base rounded-md border border-gray-700 bg-gray-800 text-gray-100 w-full ${inputRingClasses('purple')}`}
            value={toSelect}
            onChange={e => setToSelect(e.target.value)}
          >
            {toOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </CardField>

        <CardField label="Func" variant="emerald">
          <select
            className={`h-12 px-3 text-base rounded-md border border-gray-700 bg-gray-800 text-gray-100 w-full ${inputRingClasses('emerald')}`}
            value={funcFilter}
            onChange={e => setFuncFilter(e.target.value)}
          >
            {functionOptions.map(fn => <option key={fn} value={fn}>{fn}</option>)}
          </select>
        </CardField>

        <CardField label="Group" variant="amber">
          <select
            className={`h-12 px-3 text-base rounded-md border border-gray-700 bg-gray-800 text-gray-100 w-full ${inputRingClasses('amber')}`}
            value={groupBy}
            onChange={e => setGroupBy(e.target.value as any)}
          >
            <option value="none">None</option>
            <option value="from">From</option>
            <option value="to">To</option>
          </select>
        </CardField>

        <CardField label="Sort" variant="rose">
          <select
            className={`h-12 px-3 text-base rounded-md border border-gray-700 bg-gray-800 text-gray-100 w-full ${inputRingClasses('rose')}`}
            value={sortKey}
            onChange={e => setSortKey(e.target.value as any)}
          >
            <option value="timestamp">Time</option>
            <option value="block">Block</option>
            <option value="gas">Gas</option>
            <option value="status">Status</option>
            <option value="function">Func</option>
          </select>
        </CardField>

        <CardField label="Dir" variant="indigo">
          <select
            className={`h-12 px-3 text-base rounded-md border border-gray-700 bg-gray-800 text-gray-100 w-full ${inputRingClasses('indigo')}`}
            value={sortDir}
            onChange={e => setSortDir(e.target.value as any)}
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </CardField>

        <CardField label="Auto refresh" variant="cyan">
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" className="scale-125" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
              <span className="text-sm text-gray-300">Auto</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={2}
                className={`h-12 px-3 text-base rounded-md border border-gray-700 bg-gray-800 text-gray-100 w-24 ${inputRingClasses('cyan')}`}
                value={intervalSec}
                onChange={e => setIntervalSec(Number(e.target.value || 10))}
              />
              <span className="text-sm text-gray-300">s</span>
            </div>
          </div>
        </CardField>
        </div>
      </div>

      {/* Card-based actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 mb-8">
        <CardButton label="Export CSV" icon="📄" onClick={exportCsv} variant="indigo" />
        <CardButton label="Grouped CSV" icon="🗂️" onClick={exportGroupedCsv} variant="cyan" />
        <CardButton label="Download JSON" icon="🧾" onClick={downloadJson} variant="purple" />
        <CardButton label={allOpen ? 'Collapse All' : 'Expand All'} icon="↕️" onClick={toggleAllDetails} variant="emerald" />
      </div>

      {/* Mini analytics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
        <div className="rounded-xl border border-gray-700/60 bg-gradient-to-b from-gray-900 to-black p-4">
          <span className="block text-gray-400 mb-1">Total</span>
          <span className="text-lg">{filteredSorted.length}</span>
        </div>
        <div className="rounded-xl border border-gray-700/60 bg-gradient-to-b from-gray-900 to-black p-4">
          <span className="block text-gray-400 mb-1">Success %</span>
          <span className="text-lg">{(() => { const t=filteredSorted.length||1; const s=filteredSorted.filter(x=>x.status===1).length; return Math.round((s/t)*100); })()}%</span>
        </div>
        <div className="rounded-xl border border-gray-700/60 bg-gradient-to-b from-gray-900 to-black p-4">
          <span className="block text-gray-400 mb-1">Failed</span>
          <span className="text-lg">{filteredSorted.filter(x=>x.status!==1).length}</span>
        </div>
        <div className="rounded-xl border border-gray-700/60 bg-gradient-to-b from-gray-900 to-black p-4">
          <span className="block text-gray-400 mb-1">Gas (sum)</span>
          <span className="text-lg">{filteredSorted.reduce((a,x)=>a+Number(x.gasUsed||0),0)}</span>
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(grouped).map(([key, list]) => (
          <div key={key}>
            {key !== '__all__' && (
              <h2 className="text-lg font-semibold mb-2">Group: {key}</h2>
            )}
            <div className="space-y-4">
              {list
                .slice(0, groupBy === 'none' ? visibleCount : list.length)
                .map((tx, i) => (
                <div key={`${tx.txHash}-${i}`} className={`border p-4 rounded shadow ${tx.status !== 1 ? 'border-red-400' : gasStats.highGasSet.has(tx.txHash) ? 'border-yellow-400' : ''}`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p>🔁 <strong>Tx Hash:</strong> {tx.txHash} <button className="ml-2 text-xs underline" onClick={() => copyToClipboard(tx.txHash)}>Copy</button></p>
                      <p>📦 <strong>Block:</strong> {tx.block} | ⏱ <strong title={new Date(tx.timestamp as any).toLocaleString()}>{formatTimeAgo(tx.timestamp)}</strong></p>
                      <p>👤 <strong>From:</strong> {displayAddress(tx.from)} <button className="ml-2 text-xs underline" onClick={() => copyToClipboard(tx.from)}>Copy</button></p>
                      <p>➡️ <strong>To:</strong> {displayAddress(tx.to)} <button className="ml-2 text-xs underline" onClick={() => copyToClipboard(tx.to)}>Copy</button></p>
                      <p>⛽ <strong>Gas:</strong> {tx.gasUsed} | ✅ <strong>Status:</strong> {tx.status}</p>
                      {tx.function && <p>🧠 <strong>Function:</strong> {tx.function} <span className="ml-2 px-2 py-0.5 text-xs rounded bg-gray-200">{classify(tx.function)}</span></p>}
                    </div>
                    <button className="rounded-md border border-gray-700 bg-gray-800 hover:bg-gray-700 px-4 py-2 text-sm transition" onClick={() => toggleExpand(tx.txHash)}>
                      {expanded[tx.txHash] ? 'Hide details' : 'Show details'}
                    </button>
                  </div>
                  {expanded[tx.txHash] && (
                    <div className="mt-3 text-sm space-y-3">
                      {tx.valueEth && <p>💰 <strong>Value (ETH):</strong> {tx.valueEth}</p>}
                      {tx.args && <p>📥 <strong>Args:</strong> {JSON.stringify(tx.args)}</p>}

                      {tx.transfers && tx.transfers.length > 0 && (
                        <div>
                          <p>📤 <strong>Internal token transfers:</strong></p>
                          <div className="overflow-auto">
                            <table className="w-full text-xs border mt-1">
                              <thead>
                                <tr className="bg-gray-800">
                                  <th className="border px-2 py-1 text-left">Token</th>
                                  <th className="border px-2 py-1 text-left">From</th>
                                  <th className="border px-2 py-1 text-left">To</th>
                                  <th className="border px-2 py-1 text-left">Value</th>
                                </tr>
                              </thead>
                              <tbody>
                                {tx.transfers.map((tr, idx2) => (
                                  <tr key={idx2}>
                                    <td className="border px-2 py-1">{tr.token}</td>
                                    <td className="border px-2 py-1">{tr.from}</td>
                                    <td className="border px-2 py-1">{tr.to}</td>
                                    <td className="border px-2 py-1">{tr.value}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {tx.logs && tx.logs.length > 0 && (
                        <div>
                          <p>🧾 <strong>Decoded event logs:</strong></p>
                          <div className="space-y-2 mt-1">
                            {tx.logs.map((lg: any, idx3: number) => (
                              <div key={idx3} className="border rounded p-2">
                                <div className="text-xs text-gray-600 mb-1">{lg.address}</div>
                                {lg.decoded ? (
                                  <div className="text-xs">
                                    <p><strong>{lg.decoded.name}</strong></p>
                                    {lg.decoded.args && (
                                      <ul className="list-disc ml-4">
                                        {Object.entries(lg.decoded.args).map(([k,v]) => (
                                          <li key={k}><span className="text-gray-600">{k}:</span> {String(v)}</li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                ) : (
                                  <details className="text-xs">
                                    <summary>Raw log</summary>
                                    <div className="mt-1">
                                      <div className="break-all">topics: {JSON.stringify(lg.topics)}</div>
                                      <div className="break-all">data: {String(lg.data)}</div>
                                    </div>
                                  </details>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {groupBy === 'none' && list.length > visibleCount && (
              <div className="flex justify-center mt-4">
                <button className="border rounded px-4 py-2 text-sm" onClick={() => setVisibleCount(c => c + 50)}>Load more</button>
              </div>
            )}
          </div>
        ))}
        </div>
      </main>
  );
}

function CardButton({ label, onClick, icon, variant = 'indigo' }: { label: string; onClick: () => void; icon?: string; variant?: Accent }) {
  return (
    <button onClick={onClick} className={`group rounded-2xl border border-gray-700/70 bg-gradient-to-b ${buttonAccentClasses(variant)} p-5 text-left shadow-md transition`}>
      <div className="flex items-center gap-4">
        {icon ? <span className="text-2xl">{icon}</span> : null}
        <div>
          <div className="font-semibold text-gray-100 tracking-wide">{label}</div>
          <div className="text-xs text-gray-400 group-hover:text-gray-300">Click to run</div>
        </div>
      </div>
    </button>
  );
}

function CardField({ label, children, variant = 'indigo' }: { label: string; children: ReactNode; variant?: Accent }) {
  const acc = fieldAccentClasses(variant);
  return (
    <div className={`min-w-[240px] max-w-[320px] w-full rounded-2xl border border-gray-700/70 bg-gradient-to-b from-gray-900 to-black p-4 flex flex-col justify-center shadow-sm focus-within:ring-2 transition ${acc.container}`}>
      <div className={`text-[11px] uppercase tracking-wide mb-2 ${acc.label}`}>{label}</div>
      {children}
    </div>
  );
}

// Heavy chart component (client-only)
const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

function Charts({ txs }: { txs: Tx[] }) {
  // Gas usage series by time
  const gasSeries = useMemo(() => {
    return (txs || []).map(tx => ({
      name: tx.txHash,
      value: [new Date(tx.timestamp as any).getTime(), Number(tx.gasUsed || 0)],
    }));
  }, [txs]);

  const successRate = useMemo(() => {
    const total = txs.length || 1;
    const ok = txs.filter(t => t.status === 1).length;
    return Math.round((ok / total) * 100);
  }, [txs]);

  // Per-function breakdown (counts)
  const funcData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of txs) {
      const key = t.function || 'unknown';
      counts[key] = (counts[key] || 0) + 1;
    }
    const labels = Object.keys(counts).sort();
    return { labels, values: labels.map(l => counts[l]) };
  }, [txs]);

  // Token volume (sum of transfer values by token address) if present on txs
  const tokenVolume = useMemo(() => {
    const sums: Record<string, number> = {};
    for (const t of txs as any[]) {
      const transfers = t?.transfers as Array<{ token: string; value: string }> | undefined;
      if (!transfers) continue;
      for (const tr of transfers) {
        const token = tr.token || 'unknown';
        const val = Number(tr.value || 0);
        sums[token] = (sums[token] || 0) + (isNaN(val) ? 0 : val);
      }
    }
    const entries = Object.entries(sums).sort((a,b) => b[1]-a[1]).slice(0, 10);
    return { labels: entries.map(e => e[0]), values: entries.map(e => e[1]) };
  }, [txs]);

  const gasOption = {
    title: { text: 'Gas usage over time' },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'time' },
    yAxis: { type: 'value' },
    series: [
      {
        type: 'line',
        showSymbol: false,
        data: gasSeries.map(p => p.value),
      },
    ],
    grid: { left: 40, right: 20, top: 40, bottom: 50 },
  } as any;

  const pieOption = {
    title: { text: 'Success vs Failed', left: 'center' },
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'pie',
        radius: '60%',
        data: [
          { value: txs.filter(t => t.status === 1).length, name: 'Success' },
          { value: txs.filter(t => t.status !== 1).length, name: 'Failed' },
        ],
      },
    ],
  } as any;

  const funcOption = {
    title: { text: 'Transactions by function' },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: funcData.labels },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: funcData.values }],
    grid: { left: 40, right: 20, top: 40, bottom: 80 },
  } as any;

  const tokenOption = {
    title: { text: 'Top token volumes (sum of transfers)' },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: tokenVolume.labels, axisLabel: { rotate: 30 } },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: tokenVolume.values }],
    grid: { left: 40, right: 20, top: 40, bottom: 80 },
  } as any;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        <div className="rounded-2xl border border-gray-800 bg-gradient-to-b from-gray-950 to-black p-3">
          <ReactECharts option={gasOption} style={{ height: 300, width: '100%' }} />
        </div>
        <div className="rounded-2xl border border-gray-800 bg-gradient-to-b from-gray-950 to-black p-3">
          <ReactECharts option={pieOption} style={{ height: 300, width: '100%' }} />
          <p className="text-sm text-center mt-2">Success rate: {successRate}%</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        <div className="rounded-2xl border border-gray-800 bg-gradient-to-b from-gray-950 to-black p-3">
          <ReactECharts option={funcOption} style={{ height: 300, width: '100%' }} />
        </div>
        <div className="rounded-2xl border border-gray-800 bg-gradient-to-b from-gray-950 to-black p-3">
          <ReactECharts option={tokenOption} style={{ height: 300, width: '100%' }} />
        </div>
    </div>
    </>
  );
}
