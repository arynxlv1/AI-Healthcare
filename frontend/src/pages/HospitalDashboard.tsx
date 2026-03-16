import React from 'react';
import { Card, Badge, MetricCard } from '../components/ui/shared';
import { Server, Activity, ShieldCheck, Zap, BarChart3, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const mockAccuracyData = [
  { round: 1, accuracy: 0.62 },
  { round: 2, accuracy: 0.68 },
  { round: 3, accuracy: 0.75 },
  { round: 4, accuracy: 0.79 },
  { round: 5, accuracy: 0.84 },
];

export const HospitalDashboard = () => {
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
       <header className="flex items-center justify-between pb-4 border-b">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Hospital Admin Dashboard</h1>
          <p className="text-muted-foreground">St. Mary's Medical Center — Patient Privacy Monitoring</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="success" className="h-8 px-4 flex gap-2">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            FL Server Connected
          </Badge>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard label="Active FL Round" value="#42" icon={Clock} description="Round started 4m ago" />
        <MetricCard label="Privacy Budget (ε)" value="0.42 / 0.5" icon={ShieldCheck} description="Resetting in 14 hours" />
        <MetricCard label="Model Version" value="v1.2.4-stable" icon={Server} description="Deployed globally" />
        <MetricCard label="Sync Latency" value="124ms" icon={Zap} description="Optimal performance" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" /> Training Convergence
            </h3>
            <Badge>Global Model vs. Local</Badge>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockAccuracyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="round" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="accuracy" 
                  stroke="#3B82F6" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#3B82F6' }} 
                  activeDot={{ r: 6 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="lg:col-span-1">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" /> System Health
          </h3>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>ONNX Inference Latency</span>
                <span className="font-semibold text-green-600">42ms</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '40%' }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>RAG Retrieval Time</span>
                <span className="font-semibold text-primary">112ms</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '15%' }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Worker Pool Utilization</span>
                <span className="font-semibold text-orange-500">76%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-orange-500 h-2 rounded-full" style={{ width: '76%' }} />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
