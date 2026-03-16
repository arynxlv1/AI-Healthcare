import React, { useState } from 'react';
import { Card, Badge, MetricCard, cn } from '../components/ui/shared';
import { Activity, Brain, Shield, Send, Plus, Stethoscope } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const PatientPortal = () => {
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [prediction, setPrediction] = useState<any>(null);

  const addSymptom = () => {
    if (currentInput.trim() && !symptoms.includes(currentInput)) {
      setSymptoms([...symptoms, currentInput]);
      setCurrentInput('');
    }
  };

  const startDiagnosis = async () => {
    if (symptoms.length === 0) return;
    
    setIsStreaming(true);
    setStreamedText('');
    setPrediction({ label: 'Analyzing...', confidence: 0, urgency: 'low' });

    // Mock SSE Streaming behavior per plan requirements
    const mockTokens = [
      "Based", " on", " the", " symptoms", " of", " persistent", " cough", " and", " fever,", 
      " the", " system", " has", " identified", " a", " high", " probability", " of", " Influenza.", 
      " Clinical", " guidelines", " recommend", " rest", " and", " hydration."
    ];

    let current = "";
    for (const token of mockTokens) {
      await new Promise(r => setTimeout(r, 100));
      current += token;
      setStreamedText(current);
    }
    
    setPrediction({ label: 'Influenza', confidence: 0.89, urgency: 'medium' });
    setIsStreaming(false);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <header className="flex items-center justify-between pb-4 border-b">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Patient Portal</h1>
          <p className="text-muted-foreground">Privacy-preserved AI Health Assessment</p>
        </div>
        <div className="flex items-center gap-2 bg-green-500/10 text-green-600 px-3 py-1 rounded-full text-xs font-medium">
          <Shield className="h-3 w-3" />
          End-to-End Encrypted
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <section className="md:col-span-1 space-y-6">
          <Card>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add Symptoms
            </h3>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSymptom()}
                className="flex-1 bg-background border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                placeholder="e.g. Dry cough"
              />
              <button 
                onClick={addSymptom}
                className="bg-primary text-white p-2 rounded-md hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {symptoms.map(s => (
                <Badge key={s} className="px-3 py-1">{s}</Badge>
              ))}
            </div>
          </Card>

          <button 
            onClick={startDiagnosis}
            disabled={symptoms.length === 0 || isStreaming}
            className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
          >
            <Brain className="h-5 w-5" />
            {isStreaming ? 'AI is Thinking...' : 'Start AI Analysis'}
          </button>
        </section>

        <section className="md:col-span-2 space-y-6">
          <AnimatePresence>
            {prediction && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-2 gap-4">
                  <MetricCard 
                    label="Primary Prediction" 
                    value={prediction.label} 
                    icon={Stethoscope}
                  />
                  <MetricCard 
                    label="Urgency Level" 
                    value={prediction.urgency.toUpperCase()} 
                    icon={Activity}
                  />
                </div>

                <Card className="relative overflow-hidden">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Activity className="h-4 w-4" /> AI Reasoning Stream
                  </h3>
                  <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm leading-relaxed min-h-[120px]">
                    {streamedText}
                    {isStreaming && <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse" />}
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
};
