'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  Send, 
  Trash2, 
  Key, 
  Eye, 
  EyeOff, 
  Cpu, 
  Activity, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  Code, 
  Database,
  RefreshCw,
  Server,
  Upload
} from 'lucide-react';
import { sendSupervisorPrompt, SupervisorResponse } from '../services/api';

interface HistoryItem {
  id: string;
  timestamp: string;
  prompt: string;
  delegatedTo?: string;
  reasoning?: string;
  status: 'SUCCESS' | 'ERROR' | 'RUNNING';
  duration: number; // in ms
  output?: string;
  rawJson?: string;
}

export default function Dashboard() {
  // Config States (Load API Key and URL from localStorage if available)
  const [apiKey, setApiKey] = useState('');
  const [apiUrl, setApiUrl] = useState('http://127.0.0.1:8000');
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Prompt and API Interaction States
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeResponse, setActiveResponse] = useState<SupervisorResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'output' | 'json' | 'traces'>('output');
  const [executionTime, setExecutionTime] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // File Upload RAG States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'IDLE' | 'RUNNING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [uploadMessage, setUploadMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // History / Logs State (initialize with a few realistic mock records so it starts dense)
  const [history, setHistory] = useState<HistoryItem[]>([
    {
      id: 'TX-9842',
      timestamp: '13:28:40',
      prompt: 'Check the outbound sales projections for Q3 and draft a pitch email.',
      delegatedTo: '03_outbound_sdr',
      reasoning: 'Outbound sales outreach & pitch preparation is handled by the SDR agent.',
      status: 'SUCCESS',
      duration: 1840,
      output: 'Dear stakeholder, after reviewing our Q3 targets, we are projecting a 14% increase in qualified pipeline. Here is the draft outreach plan...'
    },
    {
      id: 'TX-9841',
      timestamp: '13:15:12',
      prompt: 'Filter out any PII, specifically emails and cell numbers from the transaction audit log.',
      delegatedTo: '02_ai_trust',
      reasoning: 'Request requires redacting and securing sensitive user information (PII).',
      status: 'SUCCESS',
      duration: 1250,
      output: '[AUDIT LOG SECURED] Replaced email address user_admin_99@factory.io with [REDACTED_EMAIL_1]. Replaced cell phone +1-555-0199 with [REDACTED_PHONE_1].'
    },
    {
      id: 'TX-9840',
      timestamp: '12:44:03',
      prompt: 'Analyze semiconductor market reports and list current price fluctuations.',
      delegatedTo: '01_market_analyst',
      reasoning: 'Request details financial market analysis and semiconductor commodity trends.',
      status: 'SUCCESS',
      duration: 2190,
      output: 'Semiconductor commodity index is down 1.2% this morning. NVDA chips show a slight correction to $124.50 while TSMC allocations remain flat for next quarter.'
    }
  ]);

  // System status indicator state
  const [systemOnline, setSystemOnline] = useState<boolean | null>(null);

  // Load configuration from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('X-Factory-API-Key');
      const savedUrl = localStorage.getItem('X-Factory-API-URL');
      if (savedKey) setApiKey(savedKey);
      if (savedUrl) setApiUrl(savedUrl);
    }
  }, []);

  // Check backend health on mount and API URL changes
  const checkHealth = async (urlToCheck = apiUrl) => {
    try {
      const res = await fetch(`${urlToCheck.replace(/\/$/, '')}/health`);
      if (res.ok) {
        setSystemOnline(true);
      } else {
        setSystemOnline(false);
      }
    } catch {
      setSystemOnline(false);
    }
  };

  useEffect(() => {
    checkHealth(apiUrl);
    const interval = setInterval(() => checkHealth(apiUrl), 15000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  // Save config helpers
  const saveApiKey = (val: string) => {
    setApiKey(val);
    localStorage.setItem('X-Factory-API-Key', val);
  };

  const saveApiUrl = (val: string) => {
    setApiUrl(val);
    localStorage.setItem('X-Factory-API-URL', val);
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    setUploadStatus('RUNNING');
    setUploadMessage('Uploading & Indexing document...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const cleanUrl = apiUrl.replace(/\/+$/, '');
      const response = await fetch(`${cleanUrl}/upload`, {
        method: 'POST',
        headers: {
          'X-Factory-API-Key': apiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }

      const data = await response.json();
      setUploadStatus('SUCCESS');
      setUploadMessage(data.message || 'File indexed successfully.');
      setSelectedFile(null);
    } catch (err: any) {
      setUploadStatus('ERROR');
      setUploadMessage(err.message || 'Failed to upload and index file.');
    } finally {
      setUploading(false);
    }
  };

  // Quick prompt templates
  const injectTemplate = (text: string) => {
    setPrompt(text);
  };

  // Submit main prompt
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    if (!apiKey) {
      setError('AUTHENTICATION ERROR: X-Factory-API-Key is required.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setExecutionTime(0);
    
    // Start duration timer
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      setExecutionTime(Date.now() - startTime);
    }, 50);

    const transactionId = `TX-${Math.floor(1000 + Math.random() * 9000)}`;
    const newHistoryItem: HistoryItem = {
      id: transactionId,
      timestamp: new Date().toLocaleTimeString('en-GB'),
      prompt: prompt,
      status: 'RUNNING',
      duration: 0
    };

    // Add to history as running
    setHistory(prev => [newHistoryItem, ...prev]);

    try {
      const response = await sendSupervisorPrompt(prompt, apiKey, apiUrl);
      
      const endTime = Date.now();
      const finalDuration = endTime - startTime;
      
      if (timerRef.current) clearInterval(timerRef.current);
      setExecutionTime(finalDuration);

      setActiveResponse(response);
      setActiveTab('output');

      // Update history record
      setHistory(prev => 
        prev.map(item => 
          item.id === transactionId 
            ? {
                ...item,
                status: 'SUCCESS',
                duration: finalDuration,
                delegatedTo: response.supervisor.delegated_to,
                reasoning: response.supervisor.reasoning,
                output: response.worker_output,
                rawJson: JSON.stringify(response, null, 2)
              }
            : item
        )
      );
      setPrompt('');
    } catch (err: any) {
      if (timerRef.current) clearInterval(timerRef.current);
      const endTime = Date.now();
      const finalDuration = endTime - startTime;

      const errorMessage = err.message || 'Unknown network error';
      setError(errorMessage);

      // Update history record as failed
      setHistory(prev => 
        prev.map(item => 
          item.id === transactionId 
            ? {
                ...item,
                status: 'ERROR',
                duration: finalDuration,
                output: `CRITICAL ERROR: ${errorMessage}`
              }
            : item
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    setActiveResponse(null);
  };

  return (
    <div className="flex-1 flex flex-col h-screen text-foreground select-none max-w-full">
      {/* 1. STICKY TOP HEADER */}
      <header className="sticky top-0 z-20 w-full bg-background border-b border-border px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 flex items-center justify-center bg-accent-yellow text-background font-mono font-bold text-xs select-none">
            MF
          </div>
          <div>
            <h1 className="text-[12px] font-mono tracking-wider font-semibold uppercase flex items-center gap-2">
              LangGraph Multi-Agent Factory
              <span className="text-[10px] text-muted-foreground font-normal">v1.2.0-Core</span>
            </h1>
            <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-3">
              <span>HOST: local_runtime</span>
              <span className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 inline-block ${systemOnline ? 'bg-[oklch(60%_0.18_140)]' : systemOnline === false ? 'bg-destructive' : 'bg-muted-foreground animate-pulse'}`} />
                API STATUS: {systemOnline ? 'ONLINE' : systemOnline === false ? 'OFFLINE' : 'DETERMINING'}
              </span>
            </div>
          </div>
        </div>

        {/* Real-time stats display */}
        <div className="flex items-center gap-6 font-mono text-[10px]">
          <div className="hidden md:flex items-center gap-1.5 text-muted-foreground border-l border-border pl-6">
            <Activity className="h-3 w-3 text-accent-yellow" />
            <span>ROUTING PROTOCOL: Llama-3.3-70b-Structured</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-muted-foreground border-l border-border pl-6">
            <Clock className="h-3 w-3 text-accent-magenta" />
            <span>SYSTEM TIME: {new Date().toISOString().substring(0, 19).replace('T', ' ')}</span>
          </div>
        </div>
      </header>

      {/* 2. DOCK-STYLE CONTROL PANEL & WORKSPACE (Two-Pane Layout) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-full">
        
        {/* ================= LEFT PANE (INPUT / CONTROL) ================= */}
        <section className="w-full md:w-[420px] lg:w-[460px] border-b md:border-b-0 md:border-r border-border flex flex-col bg-background/90 backdrop-blur-sm overflow-y-auto">
          
          {/* Section: Secure API Key Configuration */}
          <div className="p-4 border-b border-border bg-background/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-accent-yellow uppercase tracking-wider flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5" /> Credentials & Endpoint
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">Header Security</span>
            </div>
            
            <div className="space-y-3">
              {/* Endpoint URL Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-muted-foreground">
                  <Server className="h-3 w-3" />
                </div>
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => saveApiUrl(e.target.value)}
                  placeholder="FastAPI Base URL"
                  className="w-full pl-8 pr-3 py-1.5 text-[11px] font-mono bg-surface border border-border outline-none focus:border-accent-yellow transition-colors placeholder:text-muted-foreground/50"
                />
              </div>

              {/* Secure API Key Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-muted-foreground">
                  <Terminal className="h-3 w-3" />
                </div>
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => saveApiKey(e.target.value)}
                  placeholder="Enter X-Factory-API-Key"
                  className="w-full pl-8 pr-8 py-1.5 text-[11px] font-mono bg-surface border border-border outline-none focus:border-accent-yellow transition-colors placeholder:text-muted-foreground/50 text-accent-magenta"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-muted-foreground hover:text-foreground"
                >
                  {showApiKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </button>
              </div>
            </div>
          </div>

          {/* Section: Company Knowledge Base RAG Upload */}
          <div className="p-4 border-b border-border bg-background/50">
            <span className="text-[11px] font-mono text-accent-magenta uppercase tracking-wider block mb-2">
              Company Knowledge Base (RAG)
            </span>
            
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  const file = e.dataTransfer.files[0];
                  setSelectedFile(file);
                  handleFileUpload(file);
                }
              }}
              className={`border border-dashed p-4 flex flex-col items-center justify-center transition-all cursor-pointer ${
                isDragging 
                  ? 'border-accent-yellow bg-accent-yellow/5' 
                  : 'border-border bg-surface hover:border-accent-magenta'
              }`}
              onClick={() => document.getElementById('file-upload-input')?.click()}
            >
              <input
                type="file"
                id="file-upload-input"
                className="hidden"
                accept=".txt,.csv,.pdf"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    setSelectedFile(file);
                    handleFileUpload(file);
                  }
                }}
              />
              <Upload className={`h-6 w-6 mb-2 ${isDragging ? 'text-accent-yellow animate-pulse' : 'text-muted-foreground'}`} />
              <p className="text-[11px] font-mono text-center text-foreground font-medium mb-1">
                Drag & Drop or Click to Upload
              </p>
              <p className="text-[9px] font-mono text-muted-foreground text-center">
                Accepts .txt, .csv, .pdf (Max 10MB)
              </p>
            </div>

            {/* Upload status message in monospace data typography */}
            {uploadStatus !== 'IDLE' && (
              <div className="mt-2.5 p-2 bg-background/80 border border-border flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono text-muted-foreground">STATUS CODE:</span>
                  <span className={`text-[9px] font-mono font-bold ${
                    uploadStatus === 'SUCCESS' ? 'text-accent-yellow' : 
                    uploadStatus === 'ERROR' ? 'text-accent-magenta' : 'text-cyan-400 animate-pulse'
                  }`}>
                    {uploadStatus}
                  </span>
                </div>
                <p className="text-[10px] font-mono text-foreground break-all whitespace-pre-wrap leading-relaxed">
                  {uploadMessage}
                </p>
              </div>
            )}
          </div>

          {/* Section: Specialist Agent Profiles Floor Plan */}
          <div className="p-4 border-b border-border bg-background/30">
            <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider block mb-2.5">
              Available specialist Floor Plan
            </span>
            <div className="grid grid-cols-1 gap-2">
              <button 
                onClick={() => injectTemplate("Conduct semiconductor market research on global GPU supply shortages, analyzing NVDA and TSMC prices.")}
                className="w-full text-left p-2.5 bg-surface border border-border hover:border-accent-yellow transition-colors cursor-pointer group"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-mono text-[11px] text-accent-yellow font-medium">01_market_analyst</span>
                  <span className="text-[9px] font-mono px-1 py-0.5 border border-border bg-background text-muted-foreground">MARKET DATA</span>
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed group-hover:text-foreground">
                  Triggers financial market analysis, economic research, and price fluctuation tracking.
                </p>
              </button>

              <button 
                onClick={() => injectTemplate("Sanitize transaction report and securely redact user names, credit cards, and social security IDs.")}
                className="w-full text-left p-2.5 bg-surface border border-border hover:border-accent-yellow transition-colors cursor-pointer group"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-mono text-[11px] text-accent-yellow font-medium">02_ai_trust</span>
                  <span className="text-[9px] font-mono px-1 py-0.5 border border-border bg-background text-muted-foreground">PII REDACTION</span>
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed group-hover:text-foreground">
                  Secures and redacts personally identifiable information (PII) before external output.
                </p>
              </button>

              <button 
                onClick={() => injectTemplate("Draft a cold sales outreach email pitching our LangGraph Agent Factory to a CTO.")}
                className="w-full text-left p-2.5 bg-surface border border-border hover:border-accent-yellow transition-colors cursor-pointer group"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-mono text-[11px] text-accent-yellow font-medium">03_outbound_sdr</span>
                  <span className="text-[9px] font-mono px-1 py-0.5 border border-border bg-background text-muted-foreground">OUTREACH / SDR</span>
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed group-hover:text-foreground">
                  Drafts sales emails, product pitches, and structures sales outreach campaigns.
                </p>
              </button>
            </div>
          </div>

          {/* Section: Command console Form */}
          <div className="p-4 flex-1 flex flex-col justify-end min-h-[220px]">
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-3">
              <div className="flex-1 flex flex-col">
                <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5 flex justify-between">
                  <span>SYSTEM COMMAND PROMPT</span>
                  {prompt.length > 0 && <span className="text-accent-yellow font-mono">{prompt.length} chars</span>}
                </label>
                
                {/* Textarea inside standard 1px border grid box */}
                <div className="flex-1 min-h-[120px] relative border border-border bg-surface p-2 flex flex-col">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Enter instructions for the factory floor supervisor... (e.g. 'Draft an outreach campaign...')"
                    className="flex-1 w-full resize-none bg-transparent outline-none text-[12px] font-mono leading-relaxed placeholder:text-muted-foreground/45 text-foreground overflow-y-auto"
                    disabled={isLoading}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                  />
                  <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground/60 border-t border-border/50 pt-1.5">
                    <span>Press Enter to Submit</span>
                    <span>Shift+Enter for newline</span>
                  </div>
                </div>
              </div>

              {/* Action Trigger Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPrompt('')}
                  disabled={isLoading || !prompt}
                  className="py-2 border border-border bg-transparent text-[11px] font-mono uppercase tracking-wider hover:bg-surface disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer flex items-center justify-center gap-1.5 transition-colors text-accent-magenta"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Clear Console
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !prompt.trim()}
                  className="py-2 bg-accent-yellow text-background text-[11px] font-mono font-semibold uppercase tracking-wider hover:brightness-110 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-55 cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Routing...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" /> Run Chassis
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* ================= RIGHT PANE (OUTPUT / DATA) ================= */}
        <section className="flex-1 flex flex-col bg-background/40 backdrop-blur-sm overflow-hidden h-full">
          
          {/* Tab Navigation header */}
          <div className="border-b border-border bg-background/60 flex items-center justify-between px-4">
            <div className="flex">
              <button
                onClick={() => setActiveTab('output')}
                className={`px-4 py-3 text-[11px] font-mono uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                  activeTab === 'output'
                    ? 'border-accent-yellow text-accent-yellow bg-surface/30'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Worker Output
              </button>
              <button
                onClick={() => setActiveTab('json')}
                className={`px-4 py-3 text-[11px] font-mono uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                  activeTab === 'json'
                    ? 'border-accent-yellow text-accent-yellow bg-surface/30'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Raw JSON Payload
              </button>
              <button
                onClick={() => setActiveTab('traces')}
                className={`px-4 py-3 text-[11px] font-mono uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                  activeTab === 'traces'
                    ? 'border-accent-yellow text-accent-yellow bg-surface/30'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Runtime Logs ({history.length})
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              {isLoading && (
                <div className="text-[10px] font-mono text-accent-yellow flex items-center gap-1.5 animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-yellow animate-ping" />
                  EXECUTION CLOCK: {(executionTime / 1000).toFixed(2)}s
                </div>
              )}
            </div>
          </div>

          {/* Primary Viewports */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            
            {/* Error Banner */}
            {error && (
              <div className="border border-destructive/50 bg-destructive/10 p-3 flex gap-3 text-destructive font-mono text-[11px]">
                <XCircle className="h-4 w-4 shrink-0" />
                <div>
                  <div className="font-semibold uppercase tracking-wider">ROUTING SYSTEM EXCEPTION</div>
                  <div className="mt-1 leading-relaxed">{error}</div>
                </div>
              </div>
            )}

            {activeTab === 'output' && (
              <>
                {/* Supervisor Router Decision Section (Always visible in Worker Output tab) */}
                <div className="border border-border bg-surface/50 p-4">
                  <div className="flex items-center justify-between border-b border-border pb-2.5 mb-3">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-accent-magenta flex items-center gap-1.5">
                      <Cpu className="h-3.5 w-3.5" /> SUPERVISOR ROUTING REPORT
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">Step 1: Directed Routing</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
                    <div className="border border-border/40 bg-background/40 p-2">
                      <div className="text-[9px] text-muted-foreground uppercase mb-1">Status</div>
                      <div className="text-[12px] font-bold text-accent-yellow flex items-center gap-1.5">
                        {isLoading ? (
                          <span className="animate-pulse">PROCESSING...</span>
                        ) : activeResponse ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-[oklch(60%_0.18_140)]" />
                            {activeResponse.status.toUpperCase()}
                          </>
                        ) : (
                          <span className="text-muted-foreground">AWAITING INPUT</span>
                        )}
                      </div>
                    </div>

                    <div className="border border-border/40 bg-background/40 p-2">
                      <div className="text-[9px] text-muted-foreground uppercase mb-1">Delegated Worker</div>
                      <div className="text-[12px] font-bold text-accent-magenta">
                        {isLoading ? (
                          <span className="animate-pulse">EVALUATING...</span>
                        ) : activeResponse ? (
                          activeResponse.supervisor.delegated_to
                        ) : (
                          <span className="text-muted-foreground">STANDBY</span>
                        )}
                      </div>
                    </div>

                    <div className="border border-border/40 bg-background/40 p-2 sm:col-span-1">
                      <div className="text-[9px] text-muted-foreground uppercase mb-1">Routing Latency</div>
                      <div className="text-[12px] font-bold text-foreground">
                        {isLoading ? (
                          <span>{(executionTime / 1000).toFixed(2)}s</span>
                        ) : activeResponse ? (
                          `${(executionTime / 1000).toFixed(2)}s`
                        ) : (
                          <span className="text-muted-foreground">0.00s</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Routing Reasoning Box */}
                  <div className="mt-3 border border-border/40 bg-background/20 p-2.5">
                    <div className="text-[9px] text-muted-foreground font-mono uppercase mb-1">Routing Reasoning</div>
                    <p className="font-mono text-[11px] text-foreground leading-relaxed">
                      {isLoading ? (
                        <span className="text-muted-foreground italic animate-pulse">Running Factory Floor router analysis logic...</span>
                      ) : activeResponse ? (
                        activeResponse.supervisor.reasoning
                      ) : (
                        <span className="text-muted-foreground italic">No current instruction. Use the prompt field in the Left Pane to begin factory routing.</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Worker Output Frame */}
                <div className="flex-1 min-h-[300px] border border-border bg-surface/20 flex flex-col">
                  <div className="border-b border-border bg-background/45 px-3 py-2 flex justify-between items-center">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Database className="h-3.5 w-3.5" /> WORKER OUTPUT LOGS
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">Step 2: Execution Results</span>
                  </div>

                  <div className="flex-1 p-4 font-mono text-[12px] bg-background/30 overflow-y-auto leading-relaxed">
                    {isLoading ? (
                      <div className="flex flex-col gap-1.5 text-accent-yellow">
                        <div className="animate-pulse flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-accent-yellow animate-ping" />
                          [SYSTEM] Routing message to worker chassis...
                        </div>
                        <div className="pl-4 text-muted-foreground">
                          - Initializing LangGraph agent instance...
                        </div>
                        <div className="pl-4 text-muted-foreground animate-pulse delay-75">
                          - Injecting persona details & tool setups...
                        </div>
                      </div>
                    ) : activeResponse ? (
                      <div className="whitespace-pre-wrap text-foreground select-text selection:bg-accent-yellow selection:text-background">
                        {activeResponse.worker_output}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground/60 italic text-center p-8">
                        <div>
                          <Terminal className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                          SYSTEM STANDBY
                          <p className="text-[10px] mt-1 not-italic">Submit a request to execute target agent chassis.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'json' && (
              <div className="border border-border bg-surface/30 flex flex-col flex-1 min-h-[400px]">
                <div className="border-b border-border bg-background/45 px-3 py-2 flex justify-between items-center">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Code className="h-3.5 w-3.5 text-accent-yellow" /> Raw API Response Payload
                  </span>
                  <span className="text-[9px] font-mono text-accent-magenta">JSON-FORMATTED</span>
                </div>
                <div className="flex-1 p-4 bg-background/30 font-mono text-[11px] text-accent-yellow overflow-auto select-text">
                  {activeResponse ? (
                    <pre className="text-[11px] leading-relaxed">{JSON.stringify(activeResponse, null, 2)}</pre>
                  ) : (
                    <div className="text-muted-foreground/60 italic h-full flex items-center justify-center">
                      No active API payload. Submit a command to inspect the raw server response.
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'traces' && (
              <div className="flex flex-col flex-1 min-h-[400px] border border-border bg-surface/30">
                <div className="border-b border-border bg-background/45 px-3 py-2 flex justify-between items-center">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-accent-magenta" /> Runtime Audit Log
                  </span>
                  <button 
                    onClick={clearHistory}
                    className="text-[9px] font-mono text-accent-magenta hover:underline bg-transparent border-0 cursor-pointer"
                  >
                    Flush Logs
                  </button>
                </div>
                
                <div className="flex-1 p-4 overflow-y-auto font-mono text-[11px] space-y-3">
                  {history.length === 0 ? (
                    <div className="text-muted-foreground/60 italic h-full flex items-center justify-center">
                      Trace logs empty. Run prompts to record runtime execution events.
                    </div>
                  ) : (
                    history.map((log) => (
                      <div key={log.id} className="border border-border/40 bg-background/40 p-3 leading-relaxed">
                        <div className="flex items-center justify-between border-b border-border/20 pb-1.5 mb-2 text-[10px]">
                          <div className="flex items-center gap-2">
                            <span className="text-accent-magenta font-bold">{log.id}</span>
                            <span className="text-muted-foreground">{log.timestamp}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">LATENCY: {(log.duration / 1000).toFixed(2)}s</span>
                            <span className={`px-1 text-[9px] font-bold ${
                              log.status === 'SUCCESS' ? 'text-[oklch(60%_0.18_140)] border border-[oklch(60%_0.18_140)]/20 bg-[oklch(60%_0.18_140)]/5' :
                              log.status === 'ERROR' ? 'text-destructive border border-destructive/20 bg-destructive/5' :
                              'text-accent-yellow border border-accent-yellow/20 bg-accent-yellow/5 animate-pulse'
                            }`}>
                              {log.status}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div>
                            <span className="text-muted-foreground font-semibold">Prompt: </span>
                            <span className="text-foreground">{log.prompt}</span>
                          </div>
                          {log.delegatedTo && (
                            <div>
                              <span className="text-accent-yellow font-semibold">Router Choice: </span>
                              <span className="text-accent-magenta">{log.delegatedTo}</span>
                            </div>
                          )}
                          {log.reasoning && (
                            <div>
                              <span className="text-muted-foreground">Reasoning: </span>
                              <span className="text-muted-foreground/90 italic">{log.reasoning}</span>
                            </div>
                          )}
                          {log.output && (
                            <div className="mt-2 pt-2 border-t border-border/10 text-[10px] text-muted-foreground line-clamp-3 bg-black/10 p-1.5 overflow-hidden">
                              {log.output}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Tiny Status Bar Footer */}
          <footer className="bg-background/80 border-t border-border px-4 py-1.5 flex items-center justify-between text-[9px] font-mono text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>STATUS: SYSTEM READY</span>
              <span>GRID SCALE: 4px</span>
              <span>THEME: DATA-DENSE-PRO (DARK)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>CONNECTED PORT: 8000</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[oklch(60%_0.18_140)]" />
            </div>
          </footer>

        </section>

      </div>
    </div>
  );
}
