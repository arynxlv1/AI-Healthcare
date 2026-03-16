import React from 'react';
import { Card, Badge, MetricCard } from '../components/ui/shared';
import { Gavel, History, Terminal, Database, FileText, Settings } from 'lucide-react';

export const AdminConsole = () => {
  const auditLogs = [
    { id: '1', user: 'Dr. Sarah', action: 'Triage Confirm', resource: 'SESS_42', time: '2m ago' },
    { id: '2', user: 'System', action: 'FL Round Trigger', resource: 'ROUND_8', time: '15m ago' },
    { id: '3', user: 'Admin', action: 'Config Update', resource: 'PII_REGEX', time: '1h ago' },
    { id: '4', user: 'Dr. Mike', action: 'Triage Override', resource: 'SESS_39', time: '2h ago' },
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <header className="flex items-center justify-between pb-4 border-b">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Super Admin Console</h1>
          <p className="text-muted-foreground">Global audit logs and system configuration</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard label="Total Triage Sessions" value="1,284" icon={FileText} />
        <MetricCard label="Active Clients" value="12" icon={Database} />
        <MetricCard label="Last Aggregation" value="Success" icon={Settings} description="Completed 15m ago" />
      </div>

      <Card>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <History className="h-5 w-5 text-primary" /> Global Audit Logs
          </h3>
          <button className="text-sm bg-primary/10 text-primary px-4 py-2 rounded-lg font-medium hover:bg-primary/20 transition-colors">
            Export JSON
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="py-4 font-normal">Action</th>
                <th className="py-4 font-normal">Initiator</th>
                <th className="py-4 font-normal">Resource</th>
                <th className="py-4 font-normal">Timestamp</th>
                <th className="py-4 font-normal">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {auditLogs.map(log => (
                <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-4 font-medium">{log.action}</td>
                  <td className="py-4">{log.user}</td>
                  <td className="py-4 font-mono text-xs">{log.resource}</td>
                  <td className="py-4 text-muted-foreground">{log.time}</td>
                  <td className="py-4">
                    <Badge className="bg-green-500/10 text-green-600">SUCCESS</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
