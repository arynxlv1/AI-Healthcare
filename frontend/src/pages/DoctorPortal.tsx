import React, { useState } from 'react';
import { Card, Badge, MetricCard, cn } from '../components/ui/shared';
import { Users, AlertTriangle, CheckCircle, XCircle, Search, Filter, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const DoctorPortal = () => {
  const [activeSession, setActiveSession] = useState<any>(null);
  const [overrideNotes, setOverrideNotes] = useState('');

  const mockTriageQueue = [
    { id: '1', patient: 'Anonymous A', symptoms: ['Dry Cough', 'Fever'], urgency: 'high', diagnosis: 'Pneumonia', probability: 0.92 },
    { id: '2', patient: 'Anonymous B', symptoms: ['Body Ache', 'Headache'], urgency: 'medium', diagnosis: 'Influenza', probability: 0.74 },
    { id: '3', patient: 'Anonymous C', symptoms: ['Sneeze'], urgency: 'low', diagnosis: 'Allergy', probability: 0.81 },
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <header className="flex items-center justify-between pb-4 border-b">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Doctor Triage Portal</h1>
          <p className="text-muted-foreground">Review and validate AI-generated health assessments</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <aside className="lg:col-span-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              className="w-full bg-card border rounded-lg pl-10 pr-4 py-2 text-sm" 
              placeholder="Search patients..." 
            />
          </div>
          <div className="space-y-3">
            {mockTriageQueue.map(session => (
              <Card 
                key={session.id} 
                className={cn(
                  "cursor-pointer hover:border-primary/50 transition-all p-4",
                  activeSession?.id === session.id && "border-primary ring-1 ring-primary/20"
                )}
                onClick={() => setActiveSession(session)}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-semibold">{session.patient}</span>
                  <Badge variant={session.urgency === 'high' ? 'urgent' : 'warning'}>
                    {session.urgency.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{session.symptoms.join(', ')}</p>
              </Card>
            ))}
          </div>
        </aside>

        <main className="lg:col-span-2 space-y-6">
          <AnimatePresence mode="wait">
            {activeSession ? (
              <motion.div 
                key={activeSession.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <Card className="border-l-4 border-l-primary">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Session Detail: {activeSession.id}</h2>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <History className="h-4 w-4" /> Received 5m ago
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-2">AI Diagnosis</h4>
                      <div className="bg-primary/5 p-4 rounded-lg">
                        <p className="text-2xl font-bold text-primary">{activeSession.diagnosis}</p>
                        <p className="text-sm text-primary/70">{Math.round(activeSession.probability * 100)}% Confidence</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-2">Reported Symptoms</h4>
                      <div className="flex flex-wrap gap-2">
                        {activeSession.symptoms.map((s: string) => <Badge key={s}>{s}</Badge>)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase">Doctor Validation</h4>
                    <textarea 
                      className="w-full bg-muted/50 border rounded-xl p-4 text-sm min-h-[100px] focus:ring-2 focus:ring-primary outline-none"
                      placeholder="Add clinical override notes (Required for override)..."
                      value={overrideNotes}
                      onChange={(e) => setOverrideNotes(e.target.value)}
                    />
                    <div className="flex gap-4">
                      <button className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-all">
                        <CheckCircle className="h-5 w-5" /> Confirm AI Result
                      </button>
                      <button 
                        disabled={!overrideNotes}
                        className="flex-1 bg-destructive text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-destructive/90 transition-all disabled:opacity-50"
                      >
                        <AlertTriangle className="h-5 w-5" /> Manual Override
                      </button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ) : (
              <Card className="h-[400px] border-dashed flex flex-col items-center justify-center text-muted-foreground">
                <Users className="h-12 w-12 mb-4 opacity-20" />
                <p>Select a session from the queue to review</p>
              </Card>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
