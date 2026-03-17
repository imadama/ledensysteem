import { useCallback, useState } from 'react';
import { ReactFlow, MiniMap, Controls, Background, useNodesState, useEdgesState, addEdge, Connection, Edge, Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card } from '../components/ui/Card';

// ─── Systeem Architectuur ────────────────────────────────────────────────────

const architectureNodes: Node[] = [
  {
    id: 'frontend-group',
    type: 'group',
    data: { label: 'Frontend (React + Vite)' },
    position: { x: 0, y: 0 },
    style: { width: 400, height: 300, backgroundColor: 'rgba(11, 111, 168, 0.05)', border: '1px dashed #0B6FA8' },
  },
  {
    id: 'marketing',
    type: 'input',
    data: { label: 'Marketing Website (aidatim.nl)' },
    position: { x: 30, y: 50 },
    parentId: 'frontend-group',
    extent: 'parent',
    style: { background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '10px', width: 340 },
  },
  {
    id: 'app',
    data: { label: 'App / Portal (*.aidatim.nl)' },
    position: { x: 30, y: 150 },
    parentId: 'frontend-group',
    extent: 'parent',
    style: { background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '10px', width: 340 },
  },
  {
    id: 'backend-group',
    type: 'group',
    data: { label: 'Backend (Laravel API)' },
    position: { x: 500, y: 0 },
    style: { width: 300, height: 300, backgroundColor: 'rgba(99, 178, 51, 0.05)', border: '1px dashed #63B233' },
  },
  {
    id: 'api',
    data: { label: 'API (api.aidatim.nl)' },
    position: { x: 50, y: 100 },
    parentId: 'backend-group',
    extent: 'parent',
    style: { background: '#fff', border: '1px solid #63B233', borderRadius: '8px', padding: '10px', width: 200, fontWeight: 'bold' },
  },
  {
    id: 'db',
    type: 'output',
    data: { label: 'MySQL Database' },
    position: { x: 550, y: 400 },
    style: { background: '#eee', border: '1px solid #999', borderRadius: '8px', padding: '10px', width: 200 },
  },
  {
    id: 'cloudflare',
    type: 'input',
    data: { label: 'Cloudflare (DNS & SSL)' },
    position: { x: 250, y: -150 },
    style: { background: '#F7941D', color: 'white', border: 'none', borderRadius: '8px', padding: '10px' },
  },
  {
    id: 'stripe',
    type: 'output',
    data: { label: 'Stripe (Payments)' },
    position: { x: 900, y: 50 },
    style: { background: '#635BFF', color: 'white', border: 'none', borderRadius: '8px', padding: '10px' },
  },
  {
    id: 'mail',
    type: 'output',
    data: { label: 'SMTP (Mail)' },
    position: { x: 900, y: 150 },
    style: { background: '#EA4335', color: 'white', border: 'none', borderRadius: '8px', padding: '10px' },
  },
];

const architectureEdges: Edge[] = [
  { id: 'e1-1', source: 'cloudflare', target: 'marketing', animated: true, label: 'HTTPS' },
  { id: 'e1-2', source: 'cloudflare', target: 'app', animated: true, label: 'Wildcard SSL' },
  { id: 'e1-3', source: 'cloudflare', target: 'api', animated: true },
  { id: 'e2-1', source: 'marketing', target: 'api', animated: true, label: 'JSON' },
  { id: 'e2-2', source: 'app', target: 'api', animated: true, label: 'Sanctum Auth' },
  { id: 'e3-1', source: 'api', target: 'db', animated: true, label: 'Eloquent ORM' },
  { id: 'e3-2', source: 'api', target: 'stripe', animated: true, label: 'Webhooks' },
  { id: 'e3-3', source: 'api', target: 'mail', animated: true, label: 'Queued Jobs' },
];

// ─── Contributie Betaalproces ────────────────────────────────────────────────

const nodeStyle = (bg: string, border: string, bold = false): React.CSSProperties => ({
  background: bg,
  border: `1px solid ${border}`,
  borderRadius: '8px',
  padding: '10px',
  width: 230,
  fontSize: '12px',
  fontWeight: bold ? 'bold' : 'normal',
  textAlign: 'center',
  whiteSpace: 'pre-wrap' as const,
  lineHeight: '1.5',
});

const headerStyle = (bg: string): React.CSSProperties => ({
  background: bg,
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  padding: '12px',
  width: 230,
  fontWeight: 'bold',
  textAlign: 'center',
  fontSize: '13px',
});

const COL = { c1: 30, c2: 400, c3: 770 };
const Y = (row: number) => 80 + row * 90;

const contributionNodes: Node[] = [
  // ── Kolomkoppen ──
  { id: 'h1', data: { label: '1. SEPA Incasso Opzetten\n(door admin)' }, position: { x: COL.c1, y: 0 }, style: headerStyle('#1e40af') },
  { id: 'h2', data: { label: '2. Maandelijkse Automatische Incasso' }, position: { x: COL.c2, y: 0 }, style: headerStyle('#15803d') },
  { id: 'h3', data: { label: '3. Terugboeking (Chargeback)' }, position: { x: COL.c3, y: 0 }, style: headerStyle('#b91c1c') },

  // ── Kolom 1: SEPA Setup ──
  { id: 's1', data: { label: 'Admin klikt\n"Incasso opzetten"' }, position: { x: COL.c1, y: Y(0) }, style: nodeStyle('#ede9fe', '#7c3aed') },
  { id: 's2', data: { label: 'Frontend → API\nPOST /sepa-subscription/setup\n(IBAN + bedrag)' }, position: { x: COL.c1, y: Y(1) }, style: nodeStyle('#dbeafe', '#3b82f6') },
  { id: 's3', data: { label: 'API: Stripe Customer aanmaken\n(of hergebruiken)' }, position: { x: COL.c1, y: Y(2) }, style: nodeStyle('#dcfce7', '#16a34a') },
  { id: 's4', data: { label: 'API: SEPA Payment Method\n+ Mandate aanmaken via IBAN' }, position: { x: COL.c1, y: Y(3) }, style: nodeStyle('#dcfce7', '#16a34a') },
  { id: 's5', data: { label: 'Stripe: Subscription aanmaken\n(maandelijks)' }, position: { x: COL.c1, y: Y(4) }, style: nodeStyle('#ede9fe', '#7c3aed') },
  { id: 's6', data: { label: 'DB: MemberSubscription\nstatus = incomplete' }, position: { x: COL.c1, y: Y(5) }, style: nodeStyle('#f1f5f9', '#94a3b8') },
  { id: 's7', data: { label: 'Stripe Webhook:\ncustomer.subscription.updated' }, position: { x: COL.c1, y: Y(6) }, style: nodeStyle('#dcfce7', '#16a34a') },
  { id: 's8', data: { label: 'DB: MemberSubscription\nstatus = active ✓' }, position: { x: COL.c1, y: Y(7) }, style: nodeStyle('#bbf7d0', '#16a34a', true) },

  // ── Kolom 2: Maandelijkse incasso ──
  { id: 'm1', data: { label: 'Stripe: Maandelijkse\nfactuurdatum bereikt' }, position: { x: COL.c2, y: Y(0) }, style: nodeStyle('#ede9fe', '#7c3aed') },
  { id: 'm2', data: { label: 'Stripe: IBAN debiteren\nvia SEPA Direct Debit' }, position: { x: COL.c2, y: Y(1) }, style: nodeStyle('#ede9fe', '#7c3aed') },
  { id: 'm3', data: { label: 'Stripe Webhook:\ninvoice.payment_succeeded' }, position: { x: COL.c2, y: Y(2) }, style: nodeStyle('#dcfce7', '#16a34a') },
  { id: 'm4', data: { label: 'DB: MemberContributionRecord\nstatus = paid' }, position: { x: COL.c2, y: Y(3) }, style: nodeStyle('#f1f5f9', '#94a3b8') },
  { id: 'm5', data: { label: 'DB: PaymentTransaction\nstatus = succeeded' }, position: { x: COL.c2, y: Y(4) }, style: nodeStyle('#f1f5f9', '#94a3b8') },
  { id: 'm6', data: { label: 'Admin ziet ✓ in contributie\noverzicht / matrix' }, position: { x: COL.c2, y: Y(5) }, style: nodeStyle('#bbf7d0', '#16a34a', true) },

  // Mislukte betaling (branch van m2)
  { id: 'mf1', data: { label: 'Webhook: invoice.payment_failed\nstatus = past_due' }, position: { x: COL.c2 + 270, y: Y(2) }, style: nodeStyle('#fef2f2', '#ef4444') },
  { id: 'mf2', data: { label: 'Stripe: max. pogingen bereikt\n→ incomplete_expired / unpaid' }, position: { x: COL.c2 + 270, y: Y(3) }, style: nodeStyle('#fef2f2', '#ef4444') },
  { id: 'mf3', data: { label: 'Webhook: subscription.updated\n→ SEPA automatisch uitgeschakeld' }, position: { x: COL.c2 + 270, y: Y(4) }, style: nodeStyle('#fef2f2', '#b91c1c', true) },

  // ── Kolom 3: Terugboeking ──
  { id: 'c1', data: { label: 'Lid: Terugboeking aanvragen\nbij eigen bank' }, position: { x: COL.c3, y: Y(0) }, style: nodeStyle('#fef2f2', '#ef4444') },
  { id: 'c2', data: { label: 'Bank → Stripe:\nDispute ingediend' }, position: { x: COL.c3, y: Y(1) }, style: nodeStyle('#fef2f2', '#ef4444') },
  { id: 'c3', data: { label: 'Stripe Webhook:\ncharge.dispute.created' }, position: { x: COL.c3, y: Y(2) }, style: nodeStyle('#dcfce7', '#16a34a') },
  { id: 'c4', data: { label: 'DB: ContributionRecord → failed\nDB: PaymentTransaction → disputed' }, position: { x: COL.c3, y: Y(3) }, style: nodeStyle('#fef2f2', '#ef4444') },
  { id: 'c5', data: { label: 'Stripe: Dispute beoordeling\n(organisatie kan bewijzen leveren)' }, position: { x: COL.c3, y: Y(4) }, style: nodeStyle('#fef9c3', '#ca8a04') },

  // Branch: gewonnen / verloren
  { id: 'cw', data: { label: 'Gewonnen:\nWebhook: charge.dispute.closed\nContribution → paid\nTransaction → succeeded' }, position: { x: COL.c3 - 60, y: Y(6) }, style: nodeStyle('#bbf7d0', '#16a34a', true) },
  { id: 'cl', data: { label: 'Verloren:\nGeld terug naar lid\nBlijft disputed / failed' }, position: { x: COL.c3 + 190, y: Y(6) }, style: nodeStyle('#fecaca', '#b91c1c', true) },
];

const contributionEdges: Edge[] = [
  // Kolom 1 — SEPA Setup
  { id: 'se1', source: 's1', target: 's2', animated: true },
  { id: 'se2', source: 's2', target: 's3', animated: true },
  { id: 'se3', source: 's3', target: 's4', animated: true },
  { id: 'se4', source: 's4', target: 's5', animated: true },
  { id: 'se5', source: 's5', target: 's6', animated: true },
  { id: 'se6', source: 's6', target: 's7', animated: true, label: '~direct' },
  { id: 'se7', source: 's7', target: 's8', animated: true },

  // Kolom 2 — Maandelijkse incasso
  { id: 'me1', source: 'm1', target: 'm2', animated: true },
  { id: 'me2', source: 'm2', target: 'm3', animated: true, label: 'geslaagd' },
  { id: 'me3', source: 'm3', target: 'm4', animated: true },
  { id: 'me4', source: 'm4', target: 'm5', animated: true },
  { id: 'me5', source: 'm5', target: 'm6', animated: true },

  // Mislukte betaling branch
  { id: 'mfe1', source: 'm2', target: 'mf1', animated: true, label: 'mislukt', style: { stroke: '#ef4444' }, labelStyle: { fill: '#ef4444', fontWeight: 'bold' } },
  { id: 'mfe2', source: 'mf1', target: 'mf2', animated: true, style: { stroke: '#ef4444' } },
  { id: 'mfe3', source: 'mf2', target: 'mf3', animated: true, style: { stroke: '#ef4444' } },

  // Kolom 3 — Terugboeking
  { id: 'ce1', source: 'c1', target: 'c2', animated: true },
  { id: 'ce2', source: 'c2', target: 'c3', animated: true },
  { id: 'ce3', source: 'c3', target: 'c4', animated: true },
  { id: 'ce4', source: 'c4', target: 'c5', animated: true },
  { id: 'ce5', source: 'c5', target: 'cw', animated: true, label: 'gewonnen', style: { stroke: '#16a34a' }, labelStyle: { fill: '#16a34a', fontWeight: 'bold' } },
  { id: 'ce6', source: 'c5', target: 'cl', animated: true, label: 'verloren', style: { stroke: '#b91c1c' }, labelStyle: { fill: '#b91c1c', fontWeight: 'bold' } },
];

// ─── Legenda ─────────────────────────────────────────────────────────────────

const legend = [
  { color: '#ede9fe', border: '#7c3aed', label: 'Admin / Stripe actie' },
  { color: '#dbeafe', border: '#3b82f6', label: 'Frontend' },
  { color: '#dcfce7', border: '#16a34a', label: 'Backend / API / Webhook' },
  { color: '#f1f5f9', border: '#94a3b8', label: 'Database' },
  { color: '#fef9c3', border: '#ca8a04', label: 'In behandeling' },
  { color: '#fef2f2', border: '#ef4444', label: 'Fout / Terugboeking' },
  { color: '#bbf7d0', border: '#16a34a', label: 'Eindresultaat geslaagd' },
  { color: '#fecaca', border: '#b91c1c', label: 'Eindresultaat mislukt' },
];

// ─── Component ───────────────────────────────────────────────────────────────

type Tab = 'architecture' | 'contribution';

export default function SystemArchitecturePage() {
  const [activeTab, setActiveTab] = useState<Tab>('architecture');

  const [archNodes, , onArchNodesChange] = useNodesState(architectureNodes);
  const [archEdges, setArchEdges, onArchEdgesChange] = useEdgesState(architectureEdges);
  const onArchConnect = useCallback(
    (params: Connection) => setArchEdges((eds) => addEdge(params, eds)),
    [setArchEdges],
  );

  const [contribNodes, , onContribNodesChange] = useNodesState(contributionNodes);
  const [contribEdges, , onContribEdgesChange] = useEdgesState(contributionEdges);

  return (
    <div className="h-[calc(100vh-100px)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Systeem Architectuur</h1>
        <p className="text-gray-600 dark:text-gray-400">Visueel overzicht van het Aidatim platform.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('architecture')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'architecture'
              ? 'bg-aidatim-blue text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Systeem Architectuur
        </button>
        <button
          onClick={() => setActiveTab('contribution')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'contribution'
              ? 'bg-aidatim-blue text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Contributie Betaalproces
        </button>
      </div>

      <Card className="h-[680px] w-full border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {activeTab === 'architecture' && (
          <ReactFlow
            nodes={archNodes}
            edges={archEdges}
            onNodesChange={onArchNodesChange}
            onEdgesChange={onArchEdgesChange}
            onConnect={onArchConnect}
            fitView
            attributionPosition="bottom-right"
          >
            <Controls />
            <MiniMap
              nodeStrokeColor={(n) => (n.style?.background as string) ?? '#eee'}
              nodeColor={(n) => (n.style?.background as string) ?? '#fff'}
            />
            <Background color="#aaa" gap={16} />
          </ReactFlow>
        )}

        {activeTab === 'contribution' && (
          <ReactFlow
            nodes={contribNodes}
            edges={contribEdges}
            onNodesChange={onContribNodesChange}
            onEdgesChange={onContribEdgesChange}
            fitView
            attributionPosition="bottom-right"
          >
            <Controls />
            <MiniMap
              nodeStrokeColor={(n) => (n.style?.border as string)?.replace('1px solid ', '') ?? '#eee'}
              nodeColor={(n) => (n.style?.background as string) ?? '#fff'}
            />
            <Background color="#aaa" gap={16} />
          </ReactFlow>
        )}
      </Card>

      {/* Legenda */}
      {activeTab === 'contribution' && (
        <div className="mt-4 flex flex-wrap gap-3">
          {legend.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
              <span
                className="inline-block w-4 h-4 rounded flex-shrink-0"
                style={{ background: item.color, border: `1px solid ${item.border}` }}
              />
              {item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
