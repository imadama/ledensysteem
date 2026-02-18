import React, { useCallback } from 'react';
import { ReactFlow, MiniMap, Controls, Background, useNodesState, useEdgesState, addEdge, Connection, Edge, Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card } from '../components/ui/Card';

const initialNodes: Node[] = [
  // Frontend Group
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

  // Backend Group
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

  // Database
  {
    id: 'db',
    type: 'output',
    data: { label: 'MySQL Database' },
    position: { x: 550, y: 400 },
    style: { background: '#eee', border: '1px solid #999', borderRadius: '8px', padding: '10px', width: 200 },
  },

  // External Services
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

const initialEdges: Edge[] = [
  { id: 'e1-1', source: 'cloudflare', target: 'marketing', animated: true, label: 'HTTPS' },
  { id: 'e1-2', source: 'cloudflare', target: 'app', animated: true, label: 'Wildcard SSL' },
  { id: 'e1-3', source: 'cloudflare', target: 'api', animated: true },
  
  { id: 'e2-1', source: 'marketing', target: 'api', animated: true, label: 'JSON' },
  { id: 'e2-2', source: 'app', target: 'api', animated: true, label: 'Sanctum Auth' },
  
  { id: 'e3-1', source: 'api', target: 'db', animated: true, label: 'Eloquent ORM' },
  { id: 'e3-2', source: 'api', target: 'stripe', animated: true, label: 'Webhooks' },
  { id: 'e3-3', source: 'api', target: 'mail', animated: true, label: 'Queued Jobs' },
];

export default function SystemArchitecturePage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  return (
    <div className="h-[calc(100vh-100px)]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Systeem Architectuur</h1>
        <p className="text-gray-600 dark:text-gray-400">Visueel overzicht van het Aidatim platform.</p>
      </div>
      
      <Card className="h-[600px] w-full border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          attributionPosition="bottom-right"
        >
          <Controls />
          <MiniMap nodeStrokeColor={(n) => {
            if (n.style?.background) return n.style.background as string;
            if (n.type === 'input') return '#0041d0';
            if (n.type === 'output') return '#ff0072';
            if (n.type === 'default') return '#1a192b';
            return '#eee';
          }} nodeColor={(n) => {
            if (n.style?.background) return n.style.background as string;
            return '#fff';
          }} />
          <Background color="#aaa" gap={16} />
        </ReactFlow>
      </Card>
    </div>
  );
}
