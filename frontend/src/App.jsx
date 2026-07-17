import React, { useState, useEffect, useRef } from 'react';
import SettingsModal from './SettingsModal';

// Custom inline SVG icons for the landing page simulation widgets
const Icons = {
  Terminal: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5"></polyline>
      <line x1="12" y1="19" x2="20" y2="19"></line>
    </svg>
  ),
  Layers: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
      <polyline points="2 17 12 22 22 17"></polyline>
      <polyline points="2 12 12 17 22 12"></polyline>
    </svg>
  ),
  Shield: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    </svg>
  ),
  Cpu: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
      <rect x="9" y="9" width="6" height="6"></rect>
      <line x1="9" y1="1" x2="9" y2="4"></line>
      <line x1="15" y1="1" x2="15" y2="4"></line>
      <line x1="9" y1="20" x2="9" y2="23"></line>
      <line x1="15" y1="20" x2="15" y2="23"></line>
      <line x1="20" y1="9" x2="23" y2="9"></line>
      <line x1="20" y1="15" x2="23" y2="15"></line>
      <line x1="1" y1="9" x2="4" y2="9"></line>
      <line x1="1" y1="15" x2="4" y2="15"></line>
    </svg>
  ),
  GitBranch: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="3" x2="6" y2="15"></line>
      <circle cx="18" cy="6" r="3"></circle>
      <circle cx="6" cy="18" r="3"></circle>
      <path d="M18 9a9 9 0 0 1-9 9"></path>
    </svg>
  ),
  TrendingUp: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
      <polyline points="17 6 23 6 23 12"></polyline>
    </svg>
  ),
  Play: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3"></polygon>
    </svg>
  ),
  Activity: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
    </svg>
  ),
  Refresh: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"></polyline>
      <polyline points="1 20 1 14 7 14"></polyline>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
    </svg>
  )
};

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
  // Navigation state switcher
  const [currentView, setCurrentView] = useState('landing'); // 'landing' | 'portal'

  // Command Menu states
  const [isCmdMenuOpen, setIsCmdMenuOpen] = useState(false);
  const [cmdSearch, setCmdSearch] = useState('');
  const [selectedCmdIndex, setSelectedCmdIndex] = useState(0);

  // Command Menu Keyboard Handlers
  const filteredCommands = [
    { id: 'portal', text: 'Launch Live Sandbox Console', desc: 'Connect to active agent chassis', action: () => setCurrentView('portal') },
    { id: 'simulate_router', text: 'Run LangGraph Routing Simulator', desc: 'Verify multi agent node transitions', action: () => { setActiveTab('router'); runRouterSimulation(); } },
    { id: 'simulate_failover', text: 'Test Outage Failover Cascade', desc: 'Simulate primary cluster timeouts', action: () => { setActiveTab('failover'); triggerFailoverSimulation(); } },
    { id: 'simulate_rag', text: 'Execute Secure RAG Sanitizer', desc: 'Verify regex masking of strategy secrets', action: () => { setActiveTab('rag'); triggerRagSimulation(); } },
    { id: 'docs', text: 'Scroll to System Specs Sheet', desc: 'Inspect local zero data leakage specs', action: () => { document.querySelector('.specs-section')?.scrollIntoView({ behavior: 'smooth' }); } }
  ].filter(cmd => 
    cmd.text.toLowerCase().includes(cmdSearch.toLowerCase()) || 
    cmd.desc.toLowerCase().includes(cmdSearch.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Toggle menu: Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCmdMenuOpen(prev => !prev);
        setCmdSearch('');
        setSelectedCmdIndex(0);
      }

      if (!isCmdMenuOpen) return;

      // Navigate menu
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCmdIndex(prev => (prev + 1) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCmdIndex(prev => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedCmdIndex]) {
          filteredCommands[selectedCmdIndex].action();
          setIsCmdMenuOpen(false);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsCmdMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCmdMenuOpen, selectedCmdIndex, filteredCommands]);

  // Landing page simulation states
  const [activeTab, setActiveTab] = useState('router');
  const [mockTerminalLogs, setMockTerminalLogs] = useState([
    { time: '17:16:45', tag: 'SYSTEM', text: 'Private Quant-AI Node: LAG-01 active.' },
    { time: '17:16:46', tag: 'SECURITY', text: 'PII mask sandbox mounted in memory.' },
    { time: '17:16:48', tag: 'ROUTER', text: 'Awaiting quantitative query payload...' }
  ]);
  const [routerQuery, setRouterQuery] = useState('risk');
  const [activeNode, setActiveNode] = useState('idle');
  const [openaiStatus, setOpenaiStatus] = useState('primary');
  const [failoverLogsAdded, setFailoverLogsAdded] = useState(false);
  const [ragSource, setRagSource] = useState('raw');
  const [ragAnimating, setRagAnimating] = useState(false);

  const mockTerminalEndRef = useRef(null);

  const addMockLog = (tag, text) => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    setMockTerminalLogs(prev => [...prev, { time: timeStr, tag, text }]);
  };

  const runRouterSimulation = () => {
    if (activeNode !== 'idle') return;
    setActiveNode('router');
    addMockLog('ROUTER', `Analyzing query: "${
      routerQuery === 'risk' ? 'Compute risk metrics for portfolio allocation weights' :
      routerQuery === 'trading' ? 'Execute dynamic spread arbitrage logic on BTC/USD orderbooks' :
      'Mask custom data string containing trading secrets'
    }"`);
    setTimeout(() => {
      setActiveNode('agent');
      const routedAgent = 
        routerQuery === 'risk' ? 'Market Analyst Agent' :
        routerQuery === 'trading' ? 'Arbitrage Execution Agent' :
        'AI Trust Gateway';
      addMockLog('EXEC', `Routing weight allocated to specialist: ${routedAgent}`);
      setTimeout(() => {
        setActiveNode('done');
        addMockLog('SYSTEM', 'Query completed. Result payload compiled. Context cleared.');
        setTimeout(() => {
          setActiveNode('idle');
        }, 1500);
      }, 1500);
    }, 1500);
  };

  const triggerFailoverSimulation = () => {
    if (openaiStatus === 'offline') {
      setOpenaiStatus('primary');
      setFailoverLogsAdded(false);
      addMockLog('SYSTEM', 'Primary provider (OpenAI API) restored. Default weights reset.');
      return;
    }
    setOpenaiStatus('offline');
    addMockLog('ROUTER', 'Outbound query dispatched to OpenAI API...');
    setTimeout(() => {
      addMockLog('FAILOVER', 'Error: OpenAI API timeout (> 500ms). Status: 504 Gateway Outage.');
      addMockLog('FAILOVER', 'Cascading fallback sequence triggered immediately.');
      setTimeout(() => {
        addMockLog('FAILOVER', 'Rerouting payload to Secondary: Anthropic Claude API (Latency: 142ms).');
        addMockLog('ROUTER', 'Handshake completed with secondary cluster. Execution resumed.');
        setFailoverLogsAdded(true);
      }, 1000);
    }, 1000);
  };

  const triggerRagSimulation = () => {
    if (ragAnimating) return;
    setRagAnimating(true);
    addMockLog('INGEST', 'Reading secure dataset file: strategy_secrets.json');
    setTimeout(() => {
      addMockLog('SECURITY', 'PII detector identified raw credentials/keys in context.');
      addMockLog('SECURITY', 'Applying regex and semantic masks to target nodes...');
      setTimeout(() => {
        setRagSource('masked');
        addMockLog('SECURITY', 'Sanitized context successfully. 2 secrets redacted.');
        addMockLog('INGEST', 'Vector database embeddings stored locally.');
        setRagAnimating(false);
      }, 1200);
    }, 1200);
  };

  const resetRag = () => {
    setRagSource('raw');
    addMockLog('SYSTEM', 'Reset secure sandbox cache.');
  };

  useEffect(() => {
    if (currentView === 'landing') {
      mockTerminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mockTerminalLogs, currentView]);

  useEffect(() => {
    const rootEl = document.getElementById('root');
    if (currentView === 'landing') {
      document.body.style.overflow = 'auto';
      document.body.style.height = 'auto';
      if (rootEl) {
        rootEl.style.height = 'auto';
        rootEl.style.overflow = 'auto';
      }
    } else {
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100vh';
      if (rootEl) {
        rootEl.style.height = '100vh';
        rootEl.style.overflow = 'hidden';
      }
    }
    return () => {
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100vh';
      if (rootEl) {
        rootEl.style.height = '100vh';
        rootEl.style.overflow = 'hidden';
      }
    };
  }, [currentView]);

  // Config state
  const [backendUrl, setBackendUrl] = useState(import.meta.env.VITE_API_URL || "https://agent-factory-2.onrender.com");
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

  if (currentView === 'landing') {
    return (
      <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div className="grid-overlay"></div>

        {/* Landing Header Bar with Search Bar Trigger & View Switcher */}
        <header className="cyber-header" style={{ position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
          <div className="header-brand">
            <div className="brand-glyph">Φ</div>
            <div className="brand-text-wrapper">
              <span className="brand-main">
                AGORO // QUANT.AI <span style={{ color: 'var(--accent-teal)', fontSize: '10px' }}>// ARCHITECTURE_PORTAL</span>
              </span>
              <span className="brand-sub">Private AI Infrastructure for Quantitative Finance</span>
            </div>
          </div>

          <div className="header-meta" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Command search trigger bar */}
            <div className="cmd-search-trigger" onClick={() => setIsCmdMenuOpen(true)}>
              <span>Search commands</span>
              <kbd>⌘K</kbd>
            </div>

            <button 
              className="toggle-right-btn active"
              onClick={() => {
                setCurrentView('portal');
                addConsoleLog('info', 'Opened live Factory Console portal view.');
              }}
              style={{ borderColor: 'var(--accent-teal)', color: 'var(--accent-teal)', boxShadow: '0 0 8px var(--accent-teal-glow)' }}
            >
              [ ENTER FACTORY CONSOLE ]
            </button>
          </div>
        </header>

        <main style={{ position: 'relative', zIndex: 10, flexGrow: 1 }}>
          {/* Hero Section */}
          <section className="hero-section">
            <div className="hero-tag">ENTERPRISE PRIVATE ALPHA</div>
            <h1 className="hero-title gradient-heading">
              Private AI Infrastructure for Quantitative Finance
            </h1>
            <p className="hero-subtitle">
              Local first LangGraph architecture with triple redundant LLM failovers and secure RAG.
            </p>

            {/* Centerpiece Video Section */}
            <div className="video-centerpiece">
              <div className="video-border-effect"></div>
              <div className="video-panel-header">
                <div className="video-window-dots">
                  <div className="window-dot active"></div>
                  <div className="window-dot"></div>
                  <div className="window-dot"></div>
                </div>
                <span>ORCHESTRATION DEMO // CONFIDENTIAL DIRECTIVE</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span className="status-dot pulsing" style={{ width: '5px', height: '5px', backgroundColor: 'var(--accent-emerald)', boxShadow: '0 0 8px var(--accent-emerald)' }}></span>
                  <span style={{ fontSize: '0.65rem' }}>LIVE FEED</span>
                </div>
              </div>
              
              {/* Exactly embedding the required Loom code */}
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, border: '1px solid #26262B', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                <iframe 
                  src="https://www.loom.com/embed/8757d0480303459da7678c5c96433110" 
                  frameBorder="0" 
                  webkitallowfullscreen="true" 
                  mozallowfullscreen="true" 
                  allowFullScreen 
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                ></iframe>
              </div>
            </div>

            {/* CTA Section */}
            <div className="cta-container">
              <a href="#" className="cta-button corner-borders">
                [ Initiate Deployment Strategy Call ]
              </a>
              <span className="cta-subtext">
                Direct connection to systems architect. Or,{' '}
                <a className="cta-link-secondary" onClick={() => {
                  setCurrentView('portal');
                  addConsoleLog('info', 'Opened live Factory Console portal view.');
                }}>
                  [ Enter Sandbox Console ]
                </a>{' '}
                to run live queries.
              </span>
            </div>
          </section>

          {/* Interactive Simulation Section */}
          <section className="dashboard-grid">
            <div className="grid-header-meta">SYSTEM DEPLOYMENT SIMULATOR // VERIFICATION SUITE</div>
            <h2 className="grid-section-title">
              Interactive Architecture Validation
            </h2>

            <div className="features-layout">
              {/* Interactive Workspace Card */}
              <div className="workspace-card corner-borders">
                <div className="workspace-header">
                  <div className="workspace-tabs">
                    <button 
                      className={`workspace-tab ${activeTab === 'router' ? 'active' : ''}`}
                      onClick={() => { setActiveTab('router'); addMockLog('SYSTEM', 'Workspace: LangGraph Routing active.'); }}
                    >
                      LangGraph Router
                    </button>
                    <button 
                      className={`workspace-tab ${activeTab === 'failover' ? 'active' : ''}`}
                      onClick={() => { setActiveTab('failover'); addMockLog('SYSTEM', 'Workspace: Redundant Failovers active.'); }}
                    >
                      Failover Cascade
                    </button>
                    <button 
                      className={`workspace-tab ${activeTab === 'rag' ? 'active' : ''}`}
                      onClick={() => { setActiveTab('rag'); addMockLog('SYSTEM', 'Workspace: Secure RAG sanitization active.'); }}
                    >
                      Secure Ingestion
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    <Icons.Activity />
                    <span>SIM_SYS // V2.6</span>
                  </div>
                </div>

                <div className="workspace-content">
                  {activeTab === 'router' && (
                    <div className="langgraph-viz">
                      <div className="graph-nodes">
                        <div className="graph-connector active"></div>
                        
                        <div className="graph-node active">
                          <span className="node-label">Prompt</span>
                          <span className="node-status">INPUT</span>
                        </div>

                        <div className={`graph-node ${activeNode === 'router' ? 'active' : ''}`}>
                          <span className="node-label">LangGraph</span>
                          <span className="node-status">{activeNode === 'router' ? 'ROUTING...' : 'SUPERVISOR'}</span>
                        </div>

                        <div className={`graph-node ${activeNode === 'agent' ? 'active' : ''}`}>
                          <span className="node-label">Specialist</span>
                          <span className="node-status">
                            {activeNode === 'agent' ? (
                              routerQuery === 'risk' ? 'MARKET_ANALYST' :
                              routerQuery === 'trading' ? 'ARBITRAGE' : 'AI_TRUST'
                            ) : 'STANDBY'}
                          </span>
                        </div>

                        <div className={`graph-node ${activeNode === 'done' ? 'active' : ''}`}>
                          <span className="node-label">Output</span>
                          <span className="node-status">COMPILED</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: '400px', margin: '0 auto' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button 
                            className={`rag-option ${routerQuery === 'risk' ? 'active' : ''}`}
                            onClick={() => setRouterQuery('risk')}
                          >
                            Risk Query
                          </button>
                          <button 
                            className={`rag-option ${routerQuery === 'trading' ? 'active' : ''}`}
                            onClick={() => setRouterQuery('trading')}
                          >
                            Arbitrage Payload
                          </button>
                          <button 
                            className={`rag-option ${routerQuery === 'clean' ? 'active' : ''}`}
                            onClick={() => setRouterQuery('clean')}
                          >
                            PII Target String
                          </button>
                        </div>

                        <button className="simulate-btn" onClick={runRouterSimulation} disabled={activeNode !== 'idle'}>
                          <Icons.Play />
                          <span>{activeNode !== 'idle' ? 'Processing Transaction...' : 'Run Graph Simulation'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'failover' && (
                    <div className="failover-matrix">
                      <div className={`matrix-row ${openaiStatus === 'primary' ? 'active' : 'disabled'}`}>
                        <div className="provider-info">
                          <span className="provider-rank">01</span>
                          <div>
                            <span className="provider-name">OpenAI API Cluster</span>
                            <span className="provider-type"> (GPT-4o API)</span>
                          </div>
                        </div>
                        <div className="latency-meter">
                          <span className="latency-val">{openaiStatus === 'primary' ? '128ms' : 'TIMEOUT'}</span>
                          <span className={`status-badge ${openaiStatus === 'primary' ? 'primary' : 'offline'}`}>
                            {openaiStatus === 'primary' ? 'PRIMARY ACTIVE' : 'OFFLINE (504)'}
                          </span>
                        </div>
                      </div>

                      <div className={`matrix-row ${openaiStatus === 'offline' && !failoverLogsAdded ? 'disabled' : (openaiStatus === 'offline' && failoverLogsAdded ? 'active' : '')}`}>
                        <div className="provider-info">
                          <span className="provider-rank">02</span>
                          <div>
                            <span className="provider-name">Anthropic Claude</span>
                            <span className="provider-type"> (3.5 Sonnet)</span>
                          </div>
                        </div>
                        <div className="latency-meter">
                          <span className="latency-val">{openaiStatus === 'offline' && failoverLogsAdded ? '142ms' : '150ms'}</span>
                          <span className={`status-badge ${openaiStatus === 'offline' && failoverLogsAdded ? 'fallback' : ''}`} style={{ border: openaiStatus === 'offline' && failoverLogsAdded ? '' : '1px solid var(--border-steel)', color: openaiStatus === 'offline' && failoverLogsAdded ? '' : 'var(--text-secondary)' }}>
                            {openaiStatus === 'offline' && failoverLogsAdded ? 'ROUTING FALLBACK' : 'STANDBY'}
                          </span>
                        </div>
                      </div>

                      <div className="matrix-row">
                        <div className="provider-info">
                          <span className="provider-rank">03</span>
                          <div>
                            <span className="provider-name">Local LLM Node</span>
                            <span className="provider-type"> (DeepSeek / Llama 3)</span>
                          </div>
                        </div>
                        <div className="latency-meter">
                          <span className="latency-val">12ms</span>
                          <span className="status-badge" style={{ border: '1px solid var(--border-steel)', color: 'var(--text-secondary)' }}>
                            STANDBY (LOCAL)
                          </span>
                        </div>
                      </div>

                      <button className="simulate-btn" onClick={triggerFailoverSimulation}>
                        <Icons.Refresh />
                        <span>{openaiStatus === 'primary' ? 'Simulate Primary Outage' : 'Restore Primary Gateway'}</span>
                      </button>
                    </div>
                  )}

                  {activeTab === 'rag' && (
                    <div className="rag-sim">
                      <div className="rag-flow">
                        <div className="rag-box">
                          <div className="rag-box-title">RAW DATA INGEST</div>
                          <div className="rag-box-body">
                            {`{\n  "strategy": "Arbitrage-A",\n  "api_key": "sk-live-55a1b2c3d4",\n  "database_ip": "192.168.1.100",\n  "weights": [0.4, 0.6]\n}`}
                          </div>
                        </div>
                        
                        <div className={`rag-arrow ${ragAnimating ? 'active' : ''}`}>
                          <span>→</span>
                        </div>

                        <div className="rag-box">
                          <div className="rag-box-title">SANITIZED FOR VECTOR EMBEDDING</div>
                          <div className="rag-box-body">
                            {ragSource === 'raw' ? (
                              <span style={{ color: 'var(--text-secondary)' }}>Awaiting ingestion run...</span>
                            ) : (
                              <span style={{ color: 'var(--accent-teal)' }}>
                                {`{\n  "strategy": "Arbitrage-A",\n  "api_key": "[REDACTED_SECRET]",\n  "database_ip": "[REDACTED_IP]",\n  "weights": [0.4, 0.6]\n}`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button className="simulate-btn" onClick={triggerRagSimulation} disabled={ragAnimating}>
                          <Icons.Shield />
                          <span>{ragAnimating ? 'Sanitizing context...' : 'Verify Secure RAG Ingestion'}</span>
                        </button>
                        {ragSource === 'masked' && (
                          <button className="simulate-btn" style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#EF4444' }} onClick={resetRag}>
                            Reset Sandbox
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Diagnostic Terminal Card */}
              <div className="workspace-card corner-borders" style={{ gridColumn: 'span 5' }}>
                <div className="workspace-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icons.Terminal />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-raw)' }}>DIAGNOSTIC CORE LOGS</span>
                  </div>
                  <span className="status-dot pulsing"></span>
                </div>
                <div className="workspace-content" style={{ padding: '1rem' }}>
                  <div className="terminal-block">
                    {mockTerminalLogs.map((log, index) => (
                      <div className="terminal-line" key={index}>
                        <span className="terminal-time">[{log.time}]</span>
                        <span className={`terminal-tag ${log.tag === 'FAILOVER' ? 'failover' : log.tag === 'SECURITY' ? 'error' : ''}`}>
                          {log.tag}:
                        </span>
                        <span className="terminal-text">{log.text}</span>
                      </div>
                    ))}
                    <div ref={mockTerminalEndRef} />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Specs / Features Grid */}
          <section className="specs-section">
            <div className="grid-header-meta">ARCHITECTURAL DETAILS // SPECS SHEET</div>
            <h2 className="grid-section-title">
              Engineered For Zero Data Leakage
            </h2>

            <div className="specs-grid">
              <div className="spec-item corner-borders">
                <div className="spec-icon">
                  <Icons.GitBranch />
                </div>
                <h3 className="spec-title">LangGraph Agentic Routing</h3>
                <p className="spec-desc">
                  Orchestrate multi step reasoning cycles locally. Automatically distribute specialized tasks across a dynamic DAG, keeping calculation context intact.
                </p>
                <ul className="spec-list">
                  <li className="spec-bullet">Local python executor sandbox</li>
                  <li className="spec-bullet">Stateful multi agent feedback loops</li>
                  <li className="spec-bullet">Prebuilt quant workflow routers</li>
                </ul>
              </div>

              <div className="spec-item corner-borders">
                <div className="spec-icon">
                  <Icons.Layers />
                </div>
                <h3 className="spec-title">Triple Redundant Pipeline</h3>
                <p className="spec-desc">
                  Uncompromising availability. The network automatically switches execution pipelines if primary API limits or provider outages occur.
                </p>
                <ul className="spec-list">
                  <li className="spec-bullet">Automatic retry with fallback weights</li>
                  <li className="spec-bullet">DeepSeek & local Llama backup models</li>
                  <li className="spec-bullet">Context restoration on switchover</li>
                </ul>
              </div>

              <div className="spec-item corner-borders">
                <div className="spec-icon">
                  <Icons.Shield />
                </div>
                <h3 className="spec-title">Secure Local RAG</h3>
                <p className="spec-desc">
                  Embed your private strategy files locally. Sensitive information and trading signals are masked before any API dispatch, ensuring zero IP leakage.
                </p>
                <ul className="spec-list">
                  <li className="spec-bullet">Local vector database generation</li>
                  <li className="spec-bullet">PII filtering and key redaction</li>
                  <li className="spec-bullet">Zero external training on your code</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Strict Monospace Footer */}
          <footer className="cyber-footer">
            <p className="footer-text">
              Engineered by{' '}
              <a href="#" className="footer-attribution">
                Agoro Oluwatimilehin Teslim
              </a>{' '}
              | Quantitative Data Scientist & ML Engineer | Lagos, Nigeria
            </p>
          </footer>
        </main>

        {/* Command Menu Modal Dialog */}
        {isCmdMenuOpen && (
          <div className="cmd-menu-overlay" onClick={() => setIsCmdMenuOpen(false)}>
            <div className="cmd-menu-content" onClick={e => e.stopPropagation()}>
              <div className="cmd-menu-search-wrapper">
                <div className="cmd-menu-search-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <input 
                  type="text" 
                  className="cmd-menu-input" 
                  placeholder="Search architecture commands..." 
                  value={cmdSearch}
                  onChange={e => { setCmdSearch(e.target.value); setSelectedCmdIndex(0); }}
                  autoFocus
                />
                <span className="cmd-menu-esc">ESC</span>
              </div>
              <div className="cmd-menu-list">
                {filteredCommands.length > 0 ? (
                  filteredCommands.map((cmd, idx) => (
                    <div 
                      key={cmd.id} 
                      className={`cmd-menu-item ${idx === selectedCmdIndex ? 'active' : ''}`}
                      onClick={() => {
                        cmd.action();
                        setIsCmdMenuOpen(false);
                      }}
                    >
                      <span className="cmd-menu-item-text">{cmd.text}</span>
                      <span className="cmd-menu-item-desc">{cmd.desc}</span>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '20px', color: 'var(--text-secondary)', fontSize: '12px', textAlign: 'center' }}>
                    No matching commands found.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Cyber Industrial Header */}
      <header className="cyber-header">
        <div className="header-brand">
          <div className="brand-glyph">Φ</div>
          <div className="brand-text-wrapper">
            <span className="brand-main">
              AGORO // QUANT.AI <span style={{ color: 'var(--accent-teal)', fontSize: '10px' }}>// FACTORY_CONSOLE</span>
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
              placeholder="https://agent-factory-2.onrender.com"
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
