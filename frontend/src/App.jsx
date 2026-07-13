import React, { useState, useEffect, useRef } from 'react';
import SettingsModal from './SettingsModal';

const AGENT_PROFILES = {
  supervisor: {
    name: "Supervisor Router (Auto)",
    role: "Factory Floor Supervisor",
    desc: "Analyzes prompt intent and dynamically routes execution weights to the optimal specialist agent.",
    endpoint: "/supervisor"
  },
  "01_market_analyst": {
    name: "Market Analyst (01_market_analyst)",
    role: "Financial & Economic Specialist",
    desc: "Processes stock symbols, market trends, portfolio weights, and macroeconomic datasets.",
    endpoint: "/run/01_market_analyst"
  },
  "02_ai_trust": {
    name: "AI Trust (02_ai_trust)",
    role: "PII & Masking Gateway",
    desc: "Locates, sanitizes, and replaces sensitive data, secrets, IP addresses, and customer profiles.",
    endpoint: "/run/02_ai_trust"
  },
  "03_outbound_sdr": {
    name: "Outbound SDR (03_outbound_sdr)",
    role: "Outreach & Pitch Architect",
    desc: "Builds high-impact cold sales emails, pitches, templates, and outbound campaign hooks.",
    endpoint: "/run/03_outbound_sdr"
  }
};

const SUGGESTIONS = [
  "Analyze current trends in AI hardware stock symbols.",
  "Mask my IP 192.168.1.45, phone 555-0199 and key sk-live-abc99 from this string.",
  "Draft a cold email pitch presenting our AI Agent Factory floor."
];

// Initial memory files and insights
const INITIAL_MEMORY_FILES = [
  { name: "company_overview_2026.pdf", size: "142.4 KB", timestamp: "16:15:02" },
  { name: "sales_playbook_v3.csv", size: "48.2 KB", timestamp: "16:20:11" }
];

const INITIAL_MEMORY_INSIGHTS = [
  { text: "Established core index targeting company overview context.", source: "RAG Ingest" },
  { text: "Outbound outreach playbooks loaded and ready for Outbound SDR routing.", source: "Core Config" }
];

function App() {
  // Config state
  const [backendUrl, setBackendUrl] = useState("http://127.0.0.1:8000");
  const [apiKey, setApiKey] = useState("sk_factory_test_12345");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Layout states
  const [selectedAgent, setSelectedAgent] = useState("supervisor");
  const [rightPaneCollapsed, setRightPaneCollapsed] = useState(false);

  // Health states
  const [apiStatus, setApiStatus] = useState("checking"); // checking | online | offline
  const [apiPing, setApiPing] = useState(null);
  const [apiInfo, setApiInfo] = useState(null);

  // Ingestion & logs
  const [consoleLogs, setConsoleLogs] = useState([
    { id: 1, timestamp: getTimestamp(), type: "info", text: "Cyber-industrial workspace initialized." },
    { id: 2, timestamp: getTimestamp(), type: "info", text: "X-Factory-API-Key loaded: sk_factory_test_*****" }
  ]);

  // Memory sidebar data
  const [memoryFiles, setMemoryFiles] = useState(INITIAL_MEMORY_FILES);
  const [memoryInsights, setMemoryInsights] = useState(INITIAL_MEMORY_INSIGHTS);

  // Conversation thread
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // File Upload states
  const [uploadFile, setUploadFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingState, setUploadingState] = useState("idle"); // idle | processing | done | err

  // Chain of Thought steps
  const [cotSteps, setCotSteps] = useState([]);
  const cotTimerRef = useRef(null);

  // References
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Trigger scroll to bottom on chat changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, cotSteps]);

  // Handle health check on backend changes
  useEffect(() => {
    checkApiHealth();
  }, [backendUrl]);

  useEffect(() => {
    return () => {
      if (cotTimerRef.current) clearInterval(cotTimerRef.current);
    };
  }, []);

  function getTimestamp() {
    const now = new Date();
    return now.toTimeString().split(' ')[0];
  }

  const addLog = (type, text) => {
    setConsoleLogs(prev => [
      ...prev,
      { id: Date.now() + Math.random(), timestamp: getTimestamp(), type, text }
    ].slice(-40));
  };

  const checkApiHealth = async () => {
    setApiStatus("checking");
    const startTime = Date.now();
    try {
      const response = await fetch(`${backendUrl}/health`, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });
      const data = await response.json();
      const latency = Date.now() - startTime;
      setApiPing(latency);
      setApiStatus("online");
      setApiInfo(data.status || "Functional");
      addLog("success", `Network Handshake: ${backendUrl}/health - Online (${latency}ms)`);
    } catch (err) {
      setApiStatus("offline");
      setApiPing(null);
      setApiInfo(null);
      addLog("error", `Network Connection Refused: ${err.message}`);
    }
  };

  // --- DROPZONE FILE INGESTION ---
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const processSelectedFile = (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['txt', 'csv', 'pdf'].includes(ext)) {
      addLog("warn", `Ingest Aborted: Extension .${ext} is invalid. PDF/CSV/TXT required.`);
      return;
    }
    setUploadFile(file);
    setUploadingState("idle");
    setUploadProgress(0);
    addLog("info", `File queued for ingestion: ${file.name}`);
  };

  const executeUpload = async () => {
    if (!uploadFile) return;
    setUploadingState("processing");
    setUploadProgress(25);
    addLog("info", `Uploading file "${uploadFile.name}"...`);

    const formData = new FormData();
    formData.append("file", uploadFile);

    try {
      const clientOpenRouterKey = localStorage.getItem("X-Client-OpenRouter-Key") || "";
      const clientCerebrasKey = localStorage.getItem("X-Client-Cerebras-Key") || "";

      const headers = {
        "X-Factory-API-Key": apiKey
      };

      if (clientOpenRouterKey) {
        headers["X-Client-OpenRouter-Key"] = clientOpenRouterKey;
      }
      if (clientCerebrasKey) {
        headers["X-Client-Cerebras-Key"] = clientCerebrasKey;
      }

      const response = await fetch(`${backendUrl}/upload`, {
        method: "POST",
        headers: headers,
        body: formData
      });

      setUploadProgress(75);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || `Upload returned HTTP code ${response.status}`);
      }

      setUploadProgress(100);
      setUploadingState("done");
      
      // Update memory sidebar
      const newFileObj = {
        name: data.filename || uploadFile.name,
        size: `${(uploadFile.size / 1024).toFixed(1)} KB`,
        timestamp: getTimestamp()
      };
      setMemoryFiles(prev => [newFileObj, ...prev]);

      // Add RAG Insight to sidebar
      const newInsightObj = {
        text: `Indexed "${newFileObj.name}" into corporate search space.`,
        source: "Upload RAG"
      };
      setMemoryInsights(prev => [newInsightObj, ...prev]);

      addLog("success", `INGESTED: "${newFileObj.name}" successfully parsed. ${data.message || ""}`);
      setUploadFile(null);
    } catch (err) {
      setUploadingState("err");
      setUploadProgress(0);
      addLog("error", `Ingestion failed: ${err.message}`);
    }
  };

  // --- DYNAMIC CHAIN OF THOUGHT INDICATOR ---
  const startCotChecker = () => {
    if (cotTimerRef.current) clearInterval(cotTimerRef.current);

    const steps = [
      { id: 1, text: "Supervisor analyzing prompt intent...", status: "active" },
      { id: 2, text: "Routing token weight to specialist worker...", status: "pending" },
      { id: 3, text: "Querying corporate knowledge base index...", status: "pending" },
      { id: 4, text: "Running worker model logical synthesis...", status: "pending" },
      { id: 5, text: "Executing local microservice utilities...", status: "pending" }
    ];
    setCotSteps(steps);

    let activeStepIdx = 0;
    cotTimerRef.current = setInterval(() => {
      setCotSteps(prevSteps => {
        return prevSteps.map((step, idx) => {
          if (idx < activeStepIdx) return { ...step, status: "success" };
          if (idx === activeStepIdx) return { ...step, status: "success" };
          if (idx === activeStepIdx + 1) return { ...step, status: "active" };
          return step;
        });
      });
      activeStepIdx++;
      if (activeStepIdx >= steps.length) {
        clearInterval(cotTimerRef.current);
      }
    }, 450);
  };

  const completeCotChecker = () => {
    if (cotTimerRef.current) clearInterval(cotTimerRef.current);
    setCotSteps(prevSteps => prevSteps.map(step => ({ ...step, status: "success" })));
  };

  // --- HUMAN-IN-THE-LOOP ACTIONS ---
  const handleHITLApprove = (msgId, text) => {
    setMessages(prev => prev.map(m => {
      if (m.id === msgId) {
        return {
          ...m,
          hitl: {
            ...m.hitl,
            status: "approved",
            draftText: text,
            approvedAt: getTimestamp()
          }
        };
      }
      return m;
    }));

    // Add an insight to memory sidebar
    const activeMsg = messages.find(m => m.id === msgId);
    const agentName = activeMsg?.agentProfile || selectedAgent;
    const newInsight = {
      text: `Approved action draft from ${agentName.toUpperCase()} for outward deployment.`,
      source: "HITL Gate"
    };
    setMemoryInsights(prev => [newInsight, ...prev]);

    addLog("success", `HITL ACTION: Draft authorized & sent.`);
  };

  const handleHITLEditMode = (msgId) => {
    setMessages(prev => prev.map(m => {
      if (m.id === msgId) {
        return {
          ...m,
          hitl: {
            ...m.hitl,
            status: "editing"
          }
        };
      }
      return m;
    }));
    addLog("info", `HITL ACTION: Opened interactive draft layout editor.`);
  };

  const handleHITLSaveEdit = (msgId, text) => {
    setMessages(prev => prev.map(m => {
      if (m.id === msgId) {
        return {
          ...m,
          content: text,
          hitl: {
            ...m.hitl,
            status: "approved",
            draftText: text,
            approvedAt: getTimestamp()
          }
        };
      }
      return m;
    }));

    // Add insight to memory sidebar
    const activeMsg = messages.find(m => m.id === msgId);
    const agentName = activeMsg?.agentProfile || selectedAgent;
    const newInsight = {
      text: `Edited & executed outreach proposal draft generated by ${agentName.toUpperCase()}.`,
      source: "HITL Edit"
    };
    setMemoryInsights(prev => [newInsight, ...prev]);

    addLog("success", `HITL ACTION: Custom draft modifications saved and dispatched.`);
  };

  const handleHITLCancelEdit = (msgId) => {
    setMessages(prev => prev.map(m => {
      if (m.id === msgId) {
        return {
          ...m,
          hitl: { ...m.hitl, status: "pending" }
        };
      }
      return m;
    }));
    addLog("info", `HITL ACTION: Layout editor exited.`);
  };

  // --- QUERY SUBMISSION HANDLER ---
  const handleQuerySubmit = async (e) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const query = inputMessage;
    setInputMessage("");
    setIsLoading(true);

    // Append operator query
    const userMsgId = Date.now();
    setMessages(prev => [
      ...prev,
      { id: userMsgId, role: "user", content: query, timestamp: getTimestamp() }
    ]);
    addLog("info", `DISPATCH: Sent prompt targeting chassis profile: "${selectedAgent}"`);

    // Start CoT indicator checklist
    startCotChecker();

    try {
      const activeAgent = AGENT_PROFILES[selectedAgent];
      const endpoint = `${backendUrl}${activeAgent.endpoint}`;

      const clientOpenRouterKey = localStorage.getItem("X-Client-OpenRouter-Key") || "";
      const clientCerebrasKey = localStorage.getItem("X-Client-Cerebras-Key") || "";

      const headers = {
        "Content-Type": "application/json",
        "X-Factory-API-Key": apiKey
      };

      if (clientOpenRouterKey) {
        headers["X-Client-OpenRouter-Key"] = clientOpenRouterKey;
      }
      if (clientCerebrasKey) {
        headers["X-Client-Cerebras-Key"] = clientCerebrasKey;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ input: query })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || `Server returned HTTP code ${response.status}`);
      }

      completeCotChecker();

      let outputText = "";
      let routingInfo = null;

      if (selectedAgent === "supervisor") {
        outputText = data.worker_output || "";
        routingInfo = data.supervisor || null;
        addLog("success", `ROUTED: Supervisor routed query to ${routingInfo?.delegated_to}.`);
      } else {
        outputText = data.output || "";
        addLog("success", `COMPLETED: Run completed for profile ${data.activated_profile}.`);
      }

      // Check if draft contains email outline, proposal, log redactions, etc. to trigger HITL Action Card
      const isDraftDetected = detectDraft(outputText, selectedAgent);
      const hitlConfig = isDraftDetected ? {
        active: true,
        status: "pending",
        draftText: outputText
      } : null;

      const delegatedAgentName = selectedAgent === "supervisor" ? (routingInfo?.delegated_to || "supervisor") : selectedAgent;

      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "agent",
          content: outputText,
          timestamp: getTimestamp(),
          agentProfile: delegatedAgentName,
          routingInfo,
          hitl: hitlConfig
        }
      ]);

      // Add auto-insight to memory if it's a significant run
      if (selectedAgent === "01_market_analyst" || delegatedAgentName === "01_market_analyst") {
        setMemoryInsights(prev => [
          { text: "Financial market trend indicators extracted and compiled.", source: "Market Analyst" },
          ...prev
        ]);
      } else if (selectedAgent === "02_ai_trust" || delegatedAgentName === "02_ai_trust") {
        setMemoryInsights(prev => [
          { text: "Confidential credentials and routing variables masked in logs.", source: "AI Trust" },
          ...prev
        ]);
      }

    } catch (err) {
      if (cotTimerRef.current) clearInterval(cotTimerRef.current);
      setCotSteps([]);
      addLog("error", `Execution failure: ${err.message}`);

      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "agent",
          content: `❌ **API Run Failed**\n\nUnable to establish response pipeline from workspace node.\n\n*Diagnostic:* \`${err.message}\`\n\n*Suggestions:*\n1. Is the FastAPI service online at \`${backendUrl}\`?\n2. Confirm the master authorization headers match \`X-Factory-API-Key\`.`,
          timestamp: getTimestamp(),
          agentProfile: selectedAgent,
          isError: true
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const detectDraft = (text, agent) => {
    if (!text) return false;
    const lower = text.toLowerCase();
    
    // Explicitly classify outbound_sdr replies as drafts
    if (agent === "03_outbound_sdr" || lower.includes("03_outbound_sdr")) {
      return true;
    }
    // Key words
    if (lower.includes("subject:") || lower.includes("dear") || lower.includes("draft proposal") || lower.includes("outreach email") || lower.includes("draft email")) {
      return true;
    }
    // Complex markdown reports
    if (text.includes("```") || (text.match(/## /g) || []).length >= 2 || text.includes("|---")) {
      return true;
    }
    return false;
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleQuerySubmit();
    }
  };

  // --- MARKDOWN RENDERING UTILS ---
  const parseInlineMarkdown = (text) => {
    const regex = /(\*\*.*?\*\*|`.*?`)/g;
    const parts = text.split(regex);
    if (parts.length === 1) return text;
    
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={idx}>{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  const renderMarkdown = (text) => {
    if (!text) return null;
    
    const parts = text.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, idx) => {
      if (part.startsWith('```')) {
        const match = part.match(/```(\w*)\n([\s\S]*?)```/) || part.match(/```(\w*)\n([\s\S]*)/);
        const lang = match ? match[1] : '';
        const code = match ? match[2] : part.slice(3, -3);
        return (
          <pre key={idx} className="monospace-code-block">
            {lang && <span className="code-lang-badge">{lang}</span>}
            <code>{code}</code>
          </pre>
        );
      } else {
        const lines = part.split(/\n\n+/);
        return lines.map((line, lIdx) => {
          const trimmed = line.trim();
          if (!trimmed) return null;

          if (trimmed.startsWith('# ')) {
            return <h2 key={`${idx}-${lIdx}`} className="markdown-h1">{trimmed.replace('# ', '')}</h2>;
          }
          if (trimmed.startsWith('## ')) {
            return <h3 key={`${idx}-${lIdx}`} className="markdown-h2">{trimmed.replace('## ', '')}</h3>;
          }
          if (trimmed.startsWith('### ')) {
            return <h4 key={`${idx}-${lIdx}`} className="markdown-h3">{trimmed.replace('### ', '')}</h4>;
          }
          if (trimmed.startsWith('> ')) {
            return (
              <blockquote key={`${idx}-${lIdx}`} className="markdown-quote">
                {trimmed.replace(/^>\s*/, '')}
              </blockquote>
            );
          }
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const listItems = trimmed.split('\n').map((item, itemIdx) => {
              const cleanItem = item.replace(/^[-*]\s+/, '');
              return <li key={itemIdx}>{parseInlineMarkdown(cleanItem)}</li>;
            });
            return <ul key={`${idx}-${lIdx}`} className="markdown-list">{listItems}</ul>;
          }

          return <p key={`${idx}-${lIdx}`} className="markdown-p">{parseInlineMarkdown(trimmed)}</p>;
        });
      }
    });
  };

  return (
    <>
      {/* Cyber Industrial Header */}
      <header className="cyber-header">
        <div className="header-brand">
          <div className="brand-glyph">Φ</div>
          <div className="brand-text-wrapper">
            <span className="brand-main">
              DATA-DENSE PRO <span style={{ color: 'var(--accent-teal)', fontSize: '10px' }}>// FACTORY_CONSOLE</span>
            </span>
            <span className="brand-sub">Multi-Agent Chassis Environment</span>
          </div>
        </div>

        <div className="header-meta">
          {/* Host Setup */}
          <div className="meta-field">
            <span className="meta-label">HOST:</span>
            <input 
              type="text" 
              className="meta-input"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              placeholder="http://127.0.0.1:8000"
            />
          </div>

          {/* Master auth key */}
          <div className="meta-field">
            <span className="meta-label">X-KEY:</span>
            <input 
              type={showApiKey ? "text" : "password"} 
              className="meta-input"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="API Key"
              style={{ width: '90px' }}
            />
            <button 
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              style={{ 
                background: 'transparent', 
                border: 'none', 
                color: 'var(--text-secondary)', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '0 2px',
                outline: 'none'
              }}
              title={showApiKey ? "Hide Key" : "Show Key"}
            >
              {showApiKey ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          {/* Connection badge */}
          <div className="status-dot-wrapper">
            <span className={`dot-indicator ${apiStatus}`}></span>
            <span className="health-status-txt" style={{
              color: apiStatus === "online" ? "var(--accent-emerald)" : 
                     apiStatus === "offline" ? "var(--accent-crimson)" : "var(--accent-amber)"
            }}>
              {apiStatus}
            </span>
          </div>

          {/* Settings button */}
          <button 
            className="toggle-right-btn"
            style={{ marginRight: '8px' }}
            onClick={() => setIsSettingsOpen(true)}
          >
            ⚙️ BYOK SETTINGS
          </button>

          {/* Toggle sidebar right */}
          <button 
            className={`toggle-right-btn ${!rightPaneCollapsed ? 'active' : ''}`}
            onClick={() => setRightPaneCollapsed(!rightPaneCollapsed)}
          >
            {rightPaneCollapsed ? "◀ MEMORY SIDEBAR" : "▶ COLLAPSE SIDEBAR"}
          </button>
        </div>
      </header>

      {/* Grid container */}
      <div className="workspace-grid">
        
        {/* LEFT COLUMN: System Controls */}
        <aside className="sidebar-left">
          
          {/* Section 1: Selector */}
          <div className="cyber-card">
            <div className="cyber-card-header">
              <span className="cyber-card-title">
                ⚙️ ACTIVE SYSTEM CHASSIS
              </span>
            </div>

            <div className="cyber-select-wrapper">
              <select 
                className="cyber-select"
                value={selectedAgent}
                onChange={(e) => {
                  setSelectedAgent(e.target.value);
                  addLog("info", `Selected active routing target: ${e.target.value}`);
                }}
              >
                <option value="supervisor">Supervisor Router (Auto-route)</option>
                <option value="01_market_analyst">01_market_analyst (Market Analyst)</option>
                <option value="02_ai_trust">02_ai_trust (AI Trust Specialist)</option>
                <option value="03_outbound_sdr">03_outbound_sdr (Outbound SDR)</option>
              </select>
              <div className="cyber-select-arrow">▼</div>
            </div>

            <div className="cyber-desc">
              <strong>Role:</strong> {AGENT_PROFILES[selectedAgent].role}
              <p style={{ marginTop: '4px', fontSize: '10px', color: 'var(--text-muted)' }}>
                {AGENT_PROFILES[selectedAgent].desc}
              </p>
            </div>
          </div>

          {/* Section 2: Health check */}
          <div className="cyber-card">
            <div className="cyber-card-header">
              <span className="cyber-card-title">
                🔌 BACKEND HANDSHAKE
              </span>
              <button 
                className="btn-mini" 
                onClick={checkApiHealth}
                disabled={apiStatus === "checking"}
              >
                Ping
              </button>
            </div>

            <div className="health-row">
              <div>
                <div className="health-status-txt" style={{ color: 'var(--text-primary)' }}>
                  {apiStatus === 'online' ? 'Floor Online' : apiStatus === 'offline' ? 'Core Offline' : 'Handshake...'}
                </div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {apiInfo ? `Host status: ${apiInfo}` : 'Querying endpoints...'}
                </div>
              </div>
              {apiPing !== null && (
                <span className="health-ping-txt">{apiPing} ms</span>
              )}
            </div>
          </div>

          {/* Section 3: File ingestion */}
          <div className="cyber-card">
            <div className="cyber-card-header">
              <span className="cyber-card-title">
                📁 CONTEXT FILE INGESTION
              </span>
            </div>

            <div 
              className={`cyber-dropzone ${isDragging ? 'active' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".txt,.csv,.pdf"
                onChange={(e) => e.target.files.length && processSelectedFile(e.target.files[0])}
              />
              <div className="dropzone-glyph">📥</div>
              <span className="dropzone-msg">Drag context file or click</span>
              <span className="dropzone-cap">TXT, CSV, or PDF</span>
            </div>

            {uploadFile && (
              <div className="file-row">
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                  📄 {uploadFile.name}
                </span>
                <button 
                  className="btn-file-clear"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUploadFile(null);
                  }}
                >
                  ✕
                </button>
              </div>
            )}

            {uploadFile && uploadingState !== "processing" && (
              <button className="btn-trigger-action" onClick={executeUpload}>
                EXECUTE INGESTION
              </button>
            )}

            {uploadingState === "processing" && (
              <div style={{ width: '100%' }}>
                <div style={{ height: '3px', background: 'var(--border-steel)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--accent-teal)', transition: 'width 0.3s' }}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                  <span>indexing...</span>
                  <span>{uploadProgress}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Log screen */}
          <div className="terminal-panel">
            <div className="cyber-card-header" style={{ marginBottom: '6px' }}>
              <span className="cyber-card-title">
                📟 RUNTIME PIPELINE LOGS
              </span>
              <button 
                className="btn-mini" 
                style={{ padding: '2px 5px', fontSize: '8px' }}
                onClick={() => setConsoleLogs([])}
              >
                Clear
              </button>
            </div>

            <div className="terminal-logs">
              {consoleLogs.length === 0 ? (
                <div className="terminal-empty">Logs buffer empty. Active run hooks stream here.</div>
              ) : (
                consoleLogs.map(log => (
                  <div key={log.id} className="terminal-line">
                    <span className="terminal-time">[{log.timestamp}]</span>
                    <span className={`terminal-label-${log.type}`}>
                      {log.type.toUpperCase()}: {log.text}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </aside>

        {/* CENTER COLUMN: Collaborative Workspace */}
        <main className="workspace-center">
          
          {/* Top workspace bar */}
          <div className="workspace-top-bar">
            <div className="top-bar-title">
              <span style={{ color: 'var(--accent-teal)' }}>
                {selectedAgent === 'supervisor' ? 'SUPERVISOR CORE MATRIX' : `ACTIVE WORKER: ${selectedAgent.toUpperCase()}`}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>//</span>
              <span className="top-bar-badge">collaboration_stream</span>
            </div>

            {messages.length > 0 && (
              <button className="btn-mini" onClick={() => { setMessages([]); addLog("info", "Thread reset."); }}>
                Reset workspace
              </button>
            )}
          </div>

          {/* Streaming scrollable chat */}
          <div className="chat-log">
            {messages.length === 0 ? (
              <div className="workspace-empty">
                <div className="workspace-empty-glyph">0x00_READY</div>
                <div className="workspace-empty-title">WORKSPACE MATRIX VACANT</div>
                <div className="workspace-empty-desc">
                  Issue commands or query datasets. If Auto-routing is active, the Supervisor chassis will parse and delegate tasks to floor specialists dynamically.
                </div>
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`chat-bubble-wrap ${msg.role}`}>
                  
                  <div className={`bubble-sender ${msg.role}`}>
                    <span className="bubble-sender-dot"></span>
                    <span>
                      {msg.role === 'user' ? 'OPERATOR_UNIT' : msg.agentProfile ? msg.agentProfile.toUpperCase() : 'AGENT_CORE'}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '8px', textTransform: 'lowercase', marginLeft: '4px' }}>
                      @{msg.timestamp}
                    </span>
                  </div>

                  <div className="bubble-box">
                    
                    {/* Routing header if delegated by supervisor */}
                    {msg.routingInfo && (
                      <div className="agent-routing-callout">
                        <span>⚡ <strong>Supervisor routing:</strong> delegated execution weights to <strong>{msg.routingInfo.delegated_to}</strong></span>
                        <div style={{ marginTop: '4px', opacity: 0.85, fontSize: '9px' }}>
                          Reasoning: {msg.routingInfo.reasoning}
                        </div>
                      </div>
                    )}

                    {/* Content parsed */}
                    {renderMarkdown(msg.content)}

                    {/* Human-in-the-Loop Action Card */}
                    {msg.hitl && msg.hitl.active && (
                      <div className={`hitl-action-box ${msg.hitl.status === 'approved' ? 'approved' : ''}`}>
                        <div className="hitl-action-header">
                          <span className={`hitl-action-title ${msg.hitl.status}`}>
                            🛡️ HUMAN-IN-THE-LOOP AUTHORIZATION GATES
                          </span>
                          <span className={`hitl-status-badge ${msg.hitl.status}`}>
                            {msg.hitl.status === 'approved' ? 'authorized' : 'awaiting sign-off'}
                          </span>
                        </div>

                        {msg.hitl.status === 'editing' ? (
                          <div>
                            <textarea 
                              className="hitl-textarea-editor"
                              defaultValue={msg.hitl.draftText}
                              id={`textarea-${msg.id}`}
                            />
                            <div className="hitl-buttons">
                              <button 
                                className="btn-hitl-act-approve"
                                onClick={() => {
                                  const textVal = document.getElementById(`textarea-${msg.id}`).value;
                                  handleHITLSaveEdit(msg.id, textVal);
                                }}
                              >
                                [✓ Save & Approve]
                              </button>
                              <button 
                                className="btn-hitl-act-cancel"
                                onClick={() => handleHITLCancelEdit(msg.id)}
                              >
                                [Cancel]
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="hitl-draft-view">
                              {msg.hitl.draftText}
                            </div>

                            {msg.hitl.status === 'approved' ? (
                              <div className="hitl-approved-footer">
                                <span>✓ APPROVED & EXECUTED FOR SENDING AT {msg.hitl.approvedAt}</span>
                              </div>
                            ) : (
                              <div className="hitl-buttons">
                                <button 
                                  className="btn-hitl-act-approve"
                                  onClick={() => handleHITLApprove(msg.id, msg.hitl.draftText)}
                                >
                                  [✓ Approve & Send]
                                </button>
                                <button 
                                  className="btn-hitl-act-edit"
                                  onClick={() => handleHITLEditMode(msg.id)}
                                >
                                  [✎ Edit Layout]
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                </div>
              ))
            )}

            {/* Chain of thought visibility checklist */}
            {isLoading && cotSteps.length > 0 && (
              <div className="cot-terminal-panel">
                <div className="cot-terminal-header">
                  <span className="cot-terminal-title">
                    <span className="cot-terminal-spinner"></span>
                    CHAIN OF THOUGHT VISIBILITY (PROCESS)
                  </span>
                  <span style={{ fontSize: '8px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>matrix_thread</span>
                </div>
                <div className="cot-terminal-steps">
                  {cotSteps.map(step => (
                    <div key={step.id} className={`cot-terminal-step ${step.status}`}>
                      <span className={`cot-terminal-status ${step.status}`}>
                        {step.status === 'success' ? '[✓]' : step.status === 'active' ? '[⚡]' : '[ ]'}
                      </span>
                      <span className="cot-terminal-text">{step.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Form area */}
          <div className="chat-input-panel">
            
            {/* Quick Suggestions chips */}
            <div className="chips-row">
              {SUGGESTIONS.map((sug, idx) => (
                <div 
                  key={idx} 
                  className="chip-item"
                  onClick={() => !isLoading && setInputMessage(sug)}
                >
                  {sug}
                </div>
              ))}
            </div>

            <form onSubmit={handleQuerySubmit} className="input-row-box">
              <div className="textarea-wrap">
                <textarea 
                  className="workspace-textarea"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    selectedAgent === 'supervisor' 
                    ? "Enter target query for Supervisor Routing Core..."
                    : `Enter instruction for specialist ${AGENT_PROFILES[selectedAgent].name}...`
                  }
                  disabled={isLoading}
                />
                <span className="textarea-meta-hint">Ctrl + Enter to dispatch</span>
              </div>

              <button 
                type="submit"
                className="btn-workspace-send"
                disabled={isLoading || !inputMessage.trim()}
              >
                <span className="btn-send-glyph">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5">
                    <polyline points="22 2 11 13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </span>
              </button>
            </form>
          </div>

        </main>

        {/* RIGHT COLUMN: Collapsible Memory and Artifacts sidebar */}
        <aside className={`sidebar-right ${rightPaneCollapsed ? 'collapsed' : ''}`}>
          
          {/* Card 1: Context Files */}
          <div className="cyber-card">
            <div className="cyber-card-header">
              <span className="cyber-card-title">
                📚 INDEXED DATA CONTEXT
              </span>
            </div>
            
            <div className="memory-section">
              {memoryFiles.length === 0 ? (
                <div className="memory-insight-empty">No workspace files indexed.</div>
              ) : (
                <div className="memory-list">
                  {memoryFiles.map((file, idx) => (
                    <div key={idx} className="memory-item-card">
                      <div className="memory-item-header">
                        <span>SIZE: {file.size}</span>
                        <span>{file.timestamp}</span>
                      </div>
                      <div className="memory-item-title">📄 {file.name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Extracted insights */}
          <div className="cyber-card">
            <div className="cyber-card-header">
              <span className="cyber-card-title">
                🧠 SYSTEM MEMORY & INSIGHTS
              </span>
              <button 
                className="btn-mini" 
                style={{ padding: '2px 5px', fontSize: '8px' }}
                onClick={() => setMemoryInsights([])}
              >
                Flush
              </button>
            </div>

            <div className="memory-section">
              {memoryInsights.length === 0 ? (
                <div className="memory-insight-empty">Memory matrices clear. Insights populate on runtime actions.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {memoryInsights.map((insight, idx) => (
                    <div key={idx} className="memory-insight-card">
                      <div style={{ fontSize: '8px', color: 'var(--accent-teal)', fontFamily: 'var(--font-mono)', marginBottom: '3px', textTransform: 'uppercase' }}>
                        Source: {insight.source}
                      </div>
                      <div>{insight.text}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </aside>

        <SettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
          onSave={() => addLog("info", "Client BYOK credentials updated in local workspace context.")} 
        />
      </div>
    </>
  );
}

export default App;
