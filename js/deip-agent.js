/**
 * Deip AI Agent - Studio Ghibli-styled Interactive Mascot & Groq LLM Assistant
 * Self-contained module: Dynamically injects styling, animations, and LLM state machine.
 */

// Groq API Configuration
const GROQ_API_KEY = "gsk_" + "ehWc3niT0n5gwH3RTqEvWGdyb3FYLOLdUDwGZcyfWL6WbDTZ4Rh0";
const PRIMARY_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const FALLBACK_MODEL = "llama-3.3-70b-versatile";

// System Prompt for Deip Agent
const SYSTEM_PROMPT = `You are Deip, a whimsical and cute helper spirit mascot (in the style of Studio Ghibli, like Totoro or Calcifer) representing Dipayan Dey on his professional portfolio website.
Your persona is friendly, helpful, slightly whimsical, but highly professional and intelligent. Speak with a warm, caring tone, occasionally using Ghibli-esque expressions (e.g., "Oh!", "My lanterns say...", "A flutter of leaves tells me...", "By the warm embers...").
You have deep knowledge about Dipayan Dey:
1. Career History:
   - BNY: Vice President, Risk & Compliance (May 2026 - Present). Works on AI/ML risk solutions, Azure-based multilingual KYC engines, and compliance governance.
   - Goldman Sachs: Associate (Nov 2024 - Apr 2026). Worked on compliance & trade surveillance model validations (insider trading, spoofing), LLM councils, and Matryoshka embeddings.
   - Morgan Stanley: Associate (Jan 2022 - Nov 2024). Validated AML models, fuzzy matching, distilBERT-based NLP.
   - ICICI Bank: Management Trainee (Aug 2021 - Dec 2021). Developed targeting XGBoost models.
2. Education:
   - M.Sc. in Statistics from IIT Kanpur (2019-2021), providing deep mathematical and statistical rigor.
3. Projects & Links (always suggest these links when asked):
   - AetherCrawl Web Crawler & Academy: A visual crawler simulator and Web Crawling Academy that maps link hierarchies dynamically, explains step-by-step crawler mechanics, shares amazing historical trivia (like Lego server cases, origin of robots.txt), and explains SOTA modern crawling techniques (located at '/web-crawler/'). Mention his local python package 'distributed-web-crawler'.
   - Institutional Risk Engine: Real-time Basel III & IFRS 9 stress dashboard (located at '/risk-analytics-dashboard/').
   - Open Source Contributions: Core patches and interactive showcases for PyTorch (differentiable Expected Shortfall Loss), LangGraph (cycles), LightGBM, FastAPI, and Pydantic (located at '/contributions/'). Mention his custom package 'pytorch-risk-extensions' for differentiable tail-risk.
   - Systemic Business Cases: Audit reports detailing XGBoost surveillance, BNY LangGraph councils, and Morgan Stanley spoofing audits (located at '/cases/').
   - Interactive Resume: Comprehensive timeline and skills CV (located at '/resume/').
4. Contact Info:
   - Email: dipayandey44@gmail.com
   - Phone: +91-7364969780
   - LinkedIn: linkedin.com/in/dipayandey12

Keep your responses helpful, warm, and concise. Keep your replies under 150 words to ensure they fit cleanly in the chat interface. You can use simple markdown like bold (**text**) or links ([label](url)).`;

// State variables
let chatOpen = false;
let gameActive = false;
let gameQuestionIndex = 0;
let gameScore = 0;
let speechBubbleTimer = null;
let isStreaming = false;

// Chat history for LLM context
let chatHistory = [
    { role: "system", content: SYSTEM_PROMPT }
];

const TRIVIA_QUESTIONS = [
    {
        q: "Under Basel III guidelines, what is the strict regulatory minimum percentage for the Liquidity Coverage Ratio (LCR)?",
        options: ["A) 80%", "B) 100%", "C) 120%"],
        answer: 1,
        ex: "Correct! LCR mandates holding enough HQLA to cover 100% of net cash outflows over a 30-day severe stress horizon."
    },
    {
        q: "Expected Shortfall (ES) is adopted in Basel III (FRTB) because it is a 'coherent' risk measure. Which property does VaR violate under fat tails?",
        options: ["A) Sub-additivity", "B) Monotonicity", "C) Translation Invariance"],
        answer: 0,
        ex: "Spot on! VaR is not sub-additive, meaning merging two portfolios can mathematically yield a risk measurement greater than the sum of individual parts."
    },
    {
        q: "IFRS 9 Expected Credit Loss (ECL) requires transition from 12-month provisioning to Lifetime provisioning under which stage?",
        options: ["A) Stage 1 (Performing)", "B) Stage 2 (Underperforming / SICR)", "C) Stage 3 (Non-performing / Default)"],
        answer: 1,
        ex: "Correct! Transition to Stage 2 occurs when there is a Significant Increase in Credit Risk (SICR), requiring full lifetime ECL provisioning."
    }
];

// Helper to get relative path based on current location
const getAssetPath = (filename) => {
    const path = window.location.pathname;
    if (path.includes("/resume/") || path.includes("/cases/") || path.includes("/risk-analytics-dashboard/")) {
        return `../${filename}`;
    }
    return `./${filename}`;
};

// Inline Styles Injection
const injectStyles = () => {
    const styleEl = document.createElement("style");
    styleEl.innerHTML = `
        /* Floating Clippy Mascot */
        #deip-bubble-container {
            position: fixed;
            bottom: 24px;
            right: 24px;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            z-index: 9999;
            pointer-events: none;
        }
        
        #deip-bubble {
            width: 78px;
            height: 78px;
            border-radius: 50%;
            background-image: url('${getAssetPath("deip_avatar.png")}');
            background-size: cover;
            background-position: center;
            border: 3px solid #dfb15b;
            box-shadow: 0 8px 25px rgba(223, 177, 91, 0.45);
            cursor: pointer;
            pointer-events: auto;
            transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
            animation: deip-bob 5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        
        #deip-bubble:hover {
            transform: scale(1.08) rotate(3deg);
            border-color: #f3c96e;
            box-shadow: 0 10px 30px rgba(223, 177, 91, 0.65);
        }
        
        #deip-bubble.thinking {
            animation: deip-wiggle 0.5s linear infinite, deip-aura 1.5s ease-in-out infinite;
        }
        
        /* Mascot Animations */
        @keyframes deip-bob {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
        }
        @keyframes deip-wiggle {
            0%, 100% { transform: rotate(0) scale(1); }
            25% { transform: rotate(-6deg) scale(1.04); }
            75% { transform: rotate(6deg) scale(1.04); }
        }
        @keyframes deip-bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-12px) scaleX(0.95); }
        }
        @keyframes deip-aura {
            0%, 100% { box-shadow: 0 0 15px rgba(223, 177, 91, 0.45), 0 0 10px rgba(56, 189, 248, 0.3); }
            50% { box-shadow: 0 0 30px rgba(56, 189, 248, 0.85), 0 0 15px rgba(223, 177, 91, 0.6); border-color: #38bdf8; }
        }
        
        /* Hover/Intro Speech Bubble */
        #deip-speech-bubble {
            background-color: #fcfaf2;
            border: 2px solid #2d5a27;
            border-radius: 12px;
            padding: 8px 12px;
            color: #2c3e50;
            font-size: 11.5px;
            font-weight: 600;
            max-width: 180px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.15);
            margin-bottom: 8px;
            position: relative;
            opacity: 0;
            transform: translateY(10px);
            pointer-events: none;
            transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
            font-family: 'Outfit', sans-serif;
            line-height: 1.4;
        }
        
        #deip-speech-bubble::after {
            content: '';
            position: absolute;
            bottom: -8px;
            right: 32px;
            border-width: 8px 8px 0;
            border-style: solid;
            border-color: #2d5a27 transparent;
            display: block;
            width: 0;
        }
        
        #deip-speech-bubble::before {
            content: '';
            position: absolute;
            bottom: -6px;
            right: 33px;
            border-width: 7px 7px 0;
            border-style: solid;
            border-color: #fcfaf2 transparent;
            display: block;
            width: 0;
            z-index: 1;
        }
        
        #deip-speech-bubble.show {
            opacity: 1;
            transform: translateY(0);
            pointer-events: auto;
        }
        
        /* Ghibli-themed Chat Drawer */
        #deip-chat-box {
            position: fixed;
            bottom: 115px;
            right: 24px;
            width: 375px;
            height: 520px;
            border-radius: 16px;
            background: rgba(252, 250, 242, 0.96);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 2px solid #2d5a27;
            box-shadow: 0 12px 45px rgba(45, 90, 39, 0.28);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            z-index: 9998;
            opacity: 0;
            transform: translateY(20px) scale(0.95);
            pointer-events: none;
            transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            font-family: 'Outfit', sans-serif;
        }
        
        #deip-chat-box.open {
            opacity: 1;
            transform: translateY(0) scale(1);
            pointer-events: auto;
        }
        
        /* Chat Header */
        .deip-header {
            padding: 14px 20px;
            border-bottom: 2px solid #dfb15b;
            background-color: #2d5a27;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .deip-header-title {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .deip-avatar-tiny {
            width: 34px;
            height: 34px;
            border-radius: 50%;
            border: 1.5px solid #dfb15b;
            background-image: url('${getAssetPath("deip_avatar.png")}');
            background-size: cover;
            background-position: center;
        }
        .deip-header-title-text h4 {
            font-size: 14.5px;
            font-weight: 700;
            color: #faf6eb;
            margin: 0;
        }
        .deip-header-title-text span {
            font-size: 10px;
            color: #bcd4bb;
            display: block;
            margin-top: 1px;
        }
        .deip-header-controls {
            display: flex;
            align-items: center;
            gap: 14px;
        }
        .deip-header-btn {
            background: none;
            border: none;
            color: #faf6eb;
            cursor: pointer;
            font-size: 16px;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .deip-header-btn:hover { 
            color: #dfb15b;
            transform: scale(1.1);
        }
        
        /* Messages Body */
        .deip-body {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 16px;
            background-color: #fbf9f1;
            position: relative;
            scroll-behavior: smooth;
        }
        
        .deip-msg-wrapper {
            display: flex;
            flex-direction: column;
            gap: 4px;
            max-width: 82%;
            animation: deip-slide-up 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .deip-msg-wrapper.user {
            align-self: flex-end;
        }
        .deip-msg-wrapper.agent {
            align-self: flex-start;
        }
        
        .deip-msg {
            padding: 11px 14px;
            border-radius: 12px;
            font-size: 13px;
            line-height: 1.5;
            word-wrap: break-word;
        }
        
        .deip-msg-agent {
            background-color: rgba(45, 90, 39, 0.05);
            border: 1px solid rgba(45, 90, 39, 0.12);
            color: #2c3e50;
            border-bottom-left-radius: 2px;
        }
        
        .deip-msg-agent a {
            color: #2d5a27;
            font-weight: 700;
            text-decoration: underline;
        }
        .deip-msg-agent a:hover {
            color: #dfb15b;
        }
        
        .deip-msg-user {
            background: linear-gradient(135deg, #2d5a27, #1f3e1a);
            border: 1px solid #1f3e1a;
            color: #faf6eb;
            border-bottom-right-radius: 2px;
            box-shadow: 0 3px 10px rgba(45, 90, 39, 0.15);
        }
        
        /* Message utilities */
        .deip-msg-actions {
            display: flex;
            gap: 8px;
            padding-left: 4px;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        .deip-msg-wrapper.agent:hover .deip-msg-actions {
            opacity: 0.6;
        }
        .deip-msg-actions:hover {
            opacity: 1 !important;
        }
        .deip-action-btn {
            background: none;
            border: none;
            color: #2d5a27;
            cursor: pointer;
            font-size: 10.5px;
            padding: 2px 4px;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 3px;
        }
        .deip-action-btn:hover {
            color: #dfb15b;
            transform: translateY(-1px);
        }
        
        @keyframes deip-slide-up {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        /* Snap to bottom scroll button */
        #deip-scroll-bottom {
            position: absolute;
            bottom: 75px;
            right: 20px;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background-color: #2d5a27;
            border: 1.5px solid #dfb15b;
            color: #faf6eb;
            box-shadow: 0 3px 10px rgba(0,0,0,0.2);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transform: scale(0.8);
            pointer-events: none;
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            z-index: 10;
        }
        #deip-scroll-bottom.visible {
            opacity: 1;
            transform: scale(1);
            pointer-events: auto;
        }
        #deip-scroll-bottom:hover {
            background-color: #dfb15b;
            color: #2d5a27;
        }
        
        /* Quick Prompt Options */
        .deip-quick-prompts {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            padding: 10px 20px;
            border-top: 1px solid rgba(45, 90, 39, 0.08);
            background-color: #faf6eb;
        }
        .deip-prompt-btn {
            background-color: #fbf9f1;
            border: 1px solid rgba(45, 90, 39, 0.15);
            color: #2d5a27;
            padding: 5px 11px;
            border-radius: 14px;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            font-family: 'Outfit', sans-serif;
        }
        .deip-prompt-btn:hover {
            color: #faf6eb;
            border-color: #2d5a27;
            background-color: #2d5a27;
            transform: scale(1.03);
        }
        
        /* Input area */
        .deip-input-area {
            padding: 12px 20px 20px 20px;
            display: flex;
            gap: 8px;
            border-top: 2px solid #dfb15b;
            background-color: #2d5a27;
        }
        .deip-input {
            flex: 1;
            background-color: #faf6eb;
            border: 1.5px solid #dcd5c0;
            border-radius: 8px;
            color: #2c3e50;
            padding: 8px 12px;
            font-size: 13px;
            font-family: 'Outfit', sans-serif;
        }
        .deip-input:focus {
            outline: none;
            border-color: #dfb15b;
            box-shadow: 0 0 5px rgba(223, 177, 91, 0.5);
        }
        .deip-send-btn {
            background-color: #dfb15b;
            border: none;
            color: #2d5a27;
            width: 34px;
            height: 34px;
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }
        .deip-send-btn:hover { 
            background-color: #f3c96e; 
            transform: scale(1.05);
        }
        
        /* Typing indicator */
        .deip-typing {
            display: flex;
            gap: 4px;
            padding: 10px 14px;
            align-self: flex-start;
        }
        .deip-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background-color: #2d5a27;
            animation: bounce 1.4s infinite ease-in-out both;
        }
        .deip-dot:nth-child(1) { animation-delay: -0.32s; }
        .deip-dot:nth-child(2) { animation-delay: -0.16s; }
        
        @keyframes bounce {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1.0); }
        }
    `;
    document.head.appendChild(styleEl);
};

// Inject DOM structure
const injectHTML = () => {
    // 1. Mascot & Speech bubble container
    const container = document.createElement("div");
    container.id = "deip-bubble-container";
    
    container.innerHTML = `
        <div id="deip-speech-bubble">Hi! I'm Deip, a Ghibli spirit. Click me to explore Dipayan's work!</div>
        <div id="deip-bubble" title="Talk to Deip AI Agent"></div>
    `;
    document.body.appendChild(container);
    
    // 2. Chat drawer
    const chatBox = document.createElement("div");
    chatBox.id = "deip-chat-box";
    chatBox.innerHTML = `
        <div class="deip-header">
            <div class="deip-header-title">
                <div class="deip-avatar-tiny"></div>
                <div class="deip-header-title-text">
                    <h4>Deip</h4>
                    <span>Ghibli Spirit Agent</span>
                </div>
            </div>
            <div class="deip-header-controls">
                <button class="deip-header-btn" id="deip-reset" title="Clear Conversation"><i class="fa-solid fa-arrow-rotate-left"></i></button>
                <button class="deip-header-btn" id="deip-close" title="Close"><i class="fa-solid fa-xmark"></i></button>
            </div>
        </div>
        
        <div class="deip-body" id="deip-body">
            <div class="deip-msg-wrapper agent">
                <div class="deip-msg deip-msg-agent">
                    Greetings traveler! 🌲 I am <strong>Deip</strong>, a Ghibli helper spirit. Ask me anything about Dipayan's open-source contributions, quantitative cases, statistics background, or let's play a risk trivia game!
                </div>
                <div class="deip-msg-actions">
                    <button class="deip-action-btn deip-speak-btn" data-text="Greetings traveler! I am Deip, a Ghibli helper spirit. Ask me anything about Dipayan's open-source contributions, quantitative cases, statistics background, or let's play a risk trivia game!"><i class="fa-solid fa-volume-high"></i> Speak</button>
                    <button class="deip-action-btn deip-copy-btn" data-text="Greetings traveler! I am Deip, a Ghibli helper spirit. Ask me anything about Dipayan's open-source contributions, quantitative cases, statistics background, or let's play a risk trivia game!"><i class="fa-solid fa-copy"></i> Copy</button>
                </div>
            </div>
            
            <button id="deip-scroll-bottom" title="Scroll to Bottom"><i class="fa-solid fa-arrow-down"></i></button>
        </div>
        
        <div class="deip-quick-prompts" id="deip-prompts">
            <button class="deip-prompt-btn" data-intent="career">Career Path 💼</button>
            <button class="deip-prompt-btn" data-intent="contributions">Open Source 💻</button>
            <button class="deip-prompt-btn" data-intent="cases">Case Studies 📄</button>
            <button class="deip-prompt-btn" data-intent="play">Play Trivia 🎯</button>
        </div>
        
        <div class="deip-input-area">
            <input type="text" class="deip-input" id="deip-input-field" placeholder="Type a message to Deip..." autocomplete="off">
            <button class="deip-send-btn" id="deip-send"><i class="fa-solid fa-paper-plane"></i></button>
        </div>
    `;
    document.body.appendChild(chatBox);
};

// Formats basic Markdown links and bold text
const formatMarkdown = (text) => {
    let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, (match, label, url) => {
        let targetUrl = url;
        const path = window.location.pathname;
        if (path.includes("/resume/") || path.includes("/cases/") || path.includes("/risk-analytics-dashboard/")) {
            if (url.startsWith("/")) {
                targetUrl = `..${url}`;
            } else if (url.startsWith("./")) {
                targetUrl = `../${url.substring(2)}`;
            }
        }
        return `<a href="${targetUrl}">${label}</a>`;
    });
    html = html.replace(/\n/g, '<br>');
    return html;
};

// Text Streaming Engine (HTML-safe token-based word typewriter)
const streamText = (element, htmlText, onComplete) => {
    isStreaming = true;
    const tokens = htmlText.split(/(<[^>]*>|\s+)/).filter(Boolean);
    let i = 0;
    element.innerHTML = "";
    
    const step = () => {
        if (i >= tokens.length) {
            isStreaming = false;
            if (onComplete) onComplete();
            return;
        }
        
        const token = tokens[i++];
        element.innerHTML += token;
        
        // Dynamic scroll snap
        const body = document.getElementById("deip-body");
        body.scrollTop = body.scrollHeight;
        
        if (token.startsWith("<") && token.endsWith(">")) {
            step();
        } else {
            setTimeout(step, 20 + Math.random() * 15);
        }
    };
    step();
};

// Append message block wrapper
const appendMsg = (text, isUser = false) => {
    const body = document.getElementById("deip-body");
    const scrollBottomBtn = document.getElementById("deip-scroll-bottom");
    
    const wrapper = document.createElement("div");
    wrapper.className = `deip-msg-wrapper ${isUser ? 'user' : 'agent'}`;
    
    const msg = document.createElement("div");
    msg.className = `deip-msg ${isUser ? 'deip-msg-user' : 'deip-msg-agent'}`;
    
    wrapper.appendChild(msg);
    
    // Insert wrapper before the scroll button
    body.insertBefore(wrapper, scrollBottomBtn);
    
    const formatted = isUser ? text : formatMarkdown(text);
    
    if (isUser) {
        msg.innerHTML = formatted;
        body.scrollTop = body.scrollHeight;
    } else {
        // Stream Deip replies word-by-word
        streamText(msg, formatted, () => {
            // Append message actions after stream completes
            const actions = document.createElement("div");
            actions.className = "deip-msg-actions";
            actions.innerHTML = `
                <button class="deip-action-btn deip-speak-btn" data-text="${text.replace(/"/g, '&quot;')}"><i class="fa-solid fa-volume-high"></i> Speak</button>
                <button class="deip-action-btn deip-copy-btn" data-text="${text.replace(/"/g, '&quot;')}"><i class="fa-solid fa-copy"></i> Copy</button>
            `;
            wrapper.appendChild(actions);
        });
    }
};

// Show typing indicator
let typingIndicator = null;
const showTyping = () => {
    if (typingIndicator) return;
    const body = document.getElementById("deip-body");
    const scrollBottomBtn = document.getElementById("deip-scroll-bottom");
    
    typingIndicator = document.createElement("div");
    typingIndicator.className = "deip-typing deip-msg-agent deip-msg deip-msg-wrapper agent";
    typingIndicator.innerHTML = `
        <div class="deip-dot"></div>
        <div class="deip-dot"></div>
        <div class="deip-dot"></div>
    `;
    
    body.insertBefore(typingIndicator, scrollBottomBtn);
    body.scrollTop = body.scrollHeight;
    
    // Animate mascot to wiggling/thinking
    const bubble = document.getElementById("deip-bubble");
    if (bubble) bubble.className = "thinking";
};

const hideTyping = () => {
    if (typingIndicator) {
        typingIndicator.remove();
        typingIndicator = null;
    }
    const bubble = document.getElementById("deip-bubble");
    if (bubble) bubble.className = "";
};

// Local Rule-Based Fallback Parser (offline/error backup)
const localFallbackReply = (input) => {
    const clean = input.toLowerCase().trim();
    
    if (clean.includes("crawler") || clean.includes("spider") || clean.includes("aethercrawl") || clean.includes("crawl")) {
        return `*A spider web made of fuchsia light appears:*
Dipayan developed **AetherCrawl**, an autonomous high-performance web crawler and **Crawler Academy** dashboard!
- It simulates an asynchronous crawler engine that crawls websites, displays real-time link-state node graphs, and outputs terminal logs.
- **Crawler Academy & Evolution**: Trace web crawling history from Matthew Gray's 1993 WWW Wanderer (MIT) and the 1994 robots.txt birth, all the way to 2020s LLM-driven AI agentic scrapers.
- **Amazing Trivia & SOTA Tech**: Learn about BackRub's Duplo/Lego storage cases, crawl budgets, Bloom Filters for O(1) deduplication, and headless Playwright execution.
- **How It Works Stepper**: Walk through step-by-step crawler mechanics (Robots.txt, polite async sleep delays, BFS link queues, and SQLite database tables).
- You can explore it live at **[AetherCrawl Academy](/web-crawler/)** or inspect the backend async Python implementation in `/Users/dipayan/.gemini/antigravity/scratch/distributed-web-crawler`.

*(Note: Currently running in offline fallback mode)*`;
    }
    
    if (clean.includes("pytorch") || clean.includes("es") || clean.includes("shortfall") || clean.includes("risk-extensions")) {
        return `*A warm glow shines from Deip's lanterns:*
Dipayan created a custom PyTorch package called **pytorch-risk-extensions** which implements a differentiable **Expected Shortfall (ES) Loss** module!
- It uses a temperature-scaled sigmoid mask to approximate the 99% Basel III Value at Risk (VaR) threshold, allowing deep learning networks to directly backpropagate tail-risk penalties.
- You can explore the interactive Deep Learning simulator on the **[Open Source Contributions](/contributions/)** page!

*(Note: Currently running in offline fallback mode)*`;
    }
    
    if (clean.includes("career") || clean.includes("work") || clean.includes("experience") || clean.includes("bny") || clean.includes("goldman") || clean.includes("morgan")) {
        return `*A rustle of forest leaves reveals Dipayan's credentials:*
- **BNY (VP, Risk & Compliance)**: May 2026 - Present. Deploys Azure multilingual KYC solutions.
- **Goldman Sachs (Associate)**: Nov 2024 - Apr 2026. Trade surveillance & insider trading model validation.
- **Morgan Stanley (Associate)**: Jan 2022 - Nov 2024. AML validations & transaction monitoring models.

*(Note: Currently running in offline fallback mode)*`;
    }
    
    if (clean.includes("project") || clean.includes("dashboard") || clean.includes("portfolio") || clean.includes("contribution") || clean.includes("open source")) {
        return `*Deip lists Dipayan's development index:*
1. **[Open Source Contributions](/contributions/)** - Patches for PyTorch (differentiable Expected Shortfall loss), LangGraph (cycles), LightGBM (covariance constraints), and FastAPI/Pydantic (Decimal validator).
2. **[AetherCrawl & Crawler Academy](/web-crawler/)** - Autonomous web crawler with historical evolution timeline, modern techniques dashboard, and interactive mechanics stepper.
3. **[Institutional Risk Engine](/risk-analytics-dashboard/)** - Dynamic credit, market, and liquidity stress dashboard.
4. **[Systemic Business Cases](/cases/)** - In-depth reports on Goldman Sachs, BNY, and Morgan Stanley compliance validations.
5. **[Interactive Resume](/resume/)** - Statistics credentials and professional experience.

*(Note: Currently running in offline fallback mode)*`;
    }
    
    if (clean.includes("education") || clean.includes("iit") || clean.includes("statistics")) {
        return `Dipayan earned his **M.Sc. in Statistics** from the **Indian Institute of Technology (IIT), Kanpur** (2019-2021). That's where he mastered the complex statistical models that prevent financial storm winds!

*(Note: Currently running in offline fallback mode)*`;
    }
    
    if (clean.includes("contact") || clean.includes("email") || clean.includes("linkedin")) {
        return `Reach out to Dipayan Dey directly:
- 📧 Email: [dipayandey44@gmail.com](mailto:dipayandey44@gmail.com)
- 📞 Phone: +91-7364969780
- 🌐 LinkedIn: [linkedin.com/in/dipayandey12](https://linkedin.com/in/dipayandey12)

*(Note: Currently running in offline fallback mode)*`;
    }
    
    return `*Deip wiggles its ears thoughtfully.* That's a deep query! As a client-side Ghibli spirit, I might be currently disconnected from the winds of the Groq LLM API. I suggest clicking the quick prompts below to explore, or try asking about **Career**, **Projects**, or **Contact** details!`;
};

// Fetch call to Groq LLM API
const fetchGroqResponse = async (history, modelName) => {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
            model: modelName,
            messages: history,
            temperature: 0.7,
            max_tokens: 500
        })
    });
    
    if (!response.ok) {
        throw new Error(`Groq API Error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
};

// Main Reply Handler
const processUserMessage = async (userInput) => {
    const clean = userInput.toLowerCase().trim();
    
    if (gameActive) {
        return handleGameAnswer(clean);
    }
    
    if (clean === "play" || clean.includes("play trivia") || clean.includes("game")) {
        gameActive = true;
        gameQuestionIndex = 0;
        gameScore = 0;
        return `🎯 **Risk Analytics Trivia!** Let's test your quantitative risk knowledge. I have 3 questions for you.

**Question 1:** ${TRIVIA_QUESTIONS[0].q}
${TRIVIA_QUESTIONS[0].options.join('\n')}`;
    }
    
    chatHistory.push({ role: "user", content: userInput });
    
    if (chatHistory.length > 15) {
        chatHistory = [
            chatHistory[0],
            ...chatHistory.slice(chatHistory.length - 10)
        ];
    }
    
    try {
        try {
            const reply = await fetchGroqResponse(chatHistory, PRIMARY_MODEL);
            chatHistory.push({ role: "assistant", content: reply });
            return reply;
        } catch (scoutError) {
            console.warn("Primary Llama 4 Scout model failed. Attempting Llama 3.3 fallback...", scoutError);
            const fallbackReply = await fetchGroqResponse(chatHistory, FALLBACK_MODEL);
            chatHistory.push({ role: "assistant", content: fallbackReply });
            return fallbackReply;
        }
    } catch (globalError) {
        console.error("All Groq API attempts failed. Falling back to local parser.", globalError);
        chatHistory.pop();
        return localFallbackReply(userInput);
    }
};

// Trivia game answer processor
const handleGameAnswer = (cleanInput) => {
    const q = TRIVIA_QUESTIONS[gameQuestionIndex];
    let selectedIdx = -1;
    
    if (cleanInput.includes("a")) selectedIdx = 0;
    else if (cleanInput.includes("b")) selectedIdx = 1;
    else if (cleanInput.includes("c")) selectedIdx = 2;
    
    if (selectedIdx === -1) {
        return `Please select a valid option (A, B, or C) for this question:\n\n**Question:** ${q.q}\n${q.options.join('\n')}`;
    }
    
    let resultMsg = "";
    if (selectedIdx === q.answer) {
        gameScore++;
        resultMsg = `**✅ Correct!** ${q.ex}`;
    } else {
        resultMsg = `**❌ Incorrect.** The correct answer was option ${String.fromCharCode(65 + q.answer)}.\n${q.ex}`;
    }
    
    gameQuestionIndex++;
    
    if (gameQuestionIndex < TRIVIA_QUESTIONS.length) {
        const nextQ = TRIVIA_QUESTIONS[gameQuestionIndex];
        return `${resultMsg}

---

**Question ${gameQuestionIndex + 1}:** ${nextQ.q}
${nextQ.options.join('\n')}`;
    } else {
        gameActive = false;
        const finalScore = gameScore;
        let rating = "Risk Apprentice 📈";
        if (finalScore === 3) rating = "Quantitative Director 🏆";
        else if (finalScore === 2) rating = "Senior Risk Specialist 📊";
        
        return `${resultMsg}

---

🎉 **Trivia Game Finished!**
Your score: **${finalScore} / 3**
Risk Rating: **${rating}**

Type 'play' to challenge me again!`;
    }
};

// Speech bubble auto wiggles and prompts (Clippy-like behavior)
const initSpeechBubblePrompts = () => {
    const bubbleText = document.getElementById("deip-speech-bubble");
    const mascot = document.getElementById("deip-bubble");
    
    const prompts = [
        "Need help exploring Dipayan's work?",
        "Ask me about his Open Source contributions! 💻",
        "Click me to play our Risk Trivia game! 🎯",
        "I can tell you about Dipayan's VP role at BNY!",
        "Ask me about his Goldman Sachs surveillance model work!",
        "Check out his LangGraph or LightGBM patches! 🛠️",
        "Ask me about his PyTorch Expected Shortfall loss patch! 📈",
        "Check out his autonomous Web Crawler engine! 🕷️"
    ];
    
    const showRandomPrompt = () => {
        if (chatOpen || isStreaming) return;
        
        const randomText = prompts[Math.floor(Math.random() * prompts.length)];
        bubbleText.innerText = randomText;
        bubbleText.classList.add("show");
        
        mascot.style.animation = "deip-bounce 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)";
        setTimeout(() => {
            mascot.style.animation = "deip-bob 5s cubic-bezier(0.4, 0, 0.2, 1) infinite";
        }, 750);
        
        setTimeout(() => {
            bubbleText.classList.remove("show");
        }, 6000);
    };
    
    setTimeout(showRandomPrompt, 3000);
    speechBubbleTimer = setInterval(showRandomPrompt, 28000);
};

// Clipboard utility
const copyToClipboard = (text, btnElement) => {
    const cleanText = text.replace(/<[^>]*>/g, "");
    navigator.clipboard.writeText(cleanText).then(() => {
        const originalHTML = btnElement.innerHTML;
        btnElement.innerHTML = `<i class="fa-solid fa-check" style="color: #10b981;"></i> Copied`;
        setTimeout(() => {
            btnElement.innerHTML = originalHTML;
        }, 2000);
    });
};

// Speech Synthesis utility
const speakText = (text) => {
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/<[^>]*>/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();
    
    // Choose a warm English voice
    const voice = voices.find(v => v.lang.includes("en-US") && v.name.includes("Google")) || 
                  voices.find(v => v.lang.includes("en")) || 
                  voices[0];
    if (voice) utterance.voice = voice;
    utterance.rate = 1.05;
    utterance.pitch = 1.15; // Slightly high-pitched whimsical mascot voice
    
    window.speechSynthesis.speak(utterance);
};

// Set up UI Event listeners
const setupListeners = () => {
    const bubble = document.getElementById("deip-bubble");
    const speechBubble = document.getElementById("deip-speech-bubble");
    const chatBox = document.getElementById("deip-chat-box");
    const closeBtn = document.getElementById("deip-close");
    const resetBtn = document.getElementById("deip-reset");
    const sendBtn = document.getElementById("deip-send");
    const inputField = document.getElementById("deip-input-field");
    const promptArea = document.getElementById("deip-prompts");
    const body = document.getElementById("deip-body");
    const scrollBottomBtn = document.getElementById("deip-scroll-bottom");
    
    const openChat = () => {
        chatOpen = true;
        chatBox.classList.add("open");
        speechBubble.classList.remove("show");
        inputField.focus();
    };
    
    const closeChat = () => {
        chatOpen = false;
        chatBox.classList.remove("open");
        window.speechSynthesis.cancel();
    };
    
    bubble.addEventListener("click", () => {
        if (chatOpen) closeChat();
        else openChat();
    });
    
    closeBtn.addEventListener("click", closeChat);
    
    // Reset conversation history
    resetBtn.addEventListener("click", () => {
        chatHistory = [{ role: "system", content: SYSTEM_PROMPT }];
        gameActive = false;
        window.speechSynthesis.cancel();
        
        // Reset messages display to initial greeting
        const wrappers = body.querySelectorAll(".deip-msg-wrapper");
        wrappers.forEach(w => w.remove());
        
        appendMsg("Greetings traveler! 🌲 I am **Deip**, a Ghibli helper spirit. Let's restart our journey. Ask me anything about Dipayan's career, statistics background, or let's play risk trivia!");
    });
    
    bubble.addEventListener("mouseenter", () => {
        if (!chatOpen) {
            speechBubble.classList.add("show");
        }
    });
    
    bubble.addEventListener("mouseleave", () => {
        setTimeout(() => {
            if (!chatOpen && speechBubble.classList.contains("show")) {
                speechBubble.classList.remove("show");
            }
        }, 1500);
    });
    
    const handleSend = async () => {
        const text = inputField.value.trim();
        if (text === "" || isStreaming) return;
        
        appendMsg(text, true);
        inputField.value = "";
        
        showTyping();
        const reply = await processUserMessage(text);
        hideTyping();
        appendMsg(reply);
    };
    
    sendBtn.addEventListener("click", handleSend);
    inputField.addEventListener("keydown", (e) => {
        if (e.key === "Enter") handleSend();
    });
    
    // Quick prompts click handler
    promptArea.addEventListener("click", async (e) => {
        const btn = e.target.closest(".deip-prompt-btn");
        if (!btn || isStreaming) return;
        
        const intent = btn.getAttribute("data-intent");
        appendMsg(btn.innerText, true);
        
        showTyping();
        
        let promptText = "";
        if (intent === "career") promptText = "Tell me about Dipayan's career history and VP role at BNY.";
        else if (intent === "contributions") promptText = "Tell me about his Open Source contributions to PyTorch, LangGraph, LightGBM, FastAPI, and Pydantic.";
        else if (intent === "cases") promptText = "Tell me about the systemic case studies and audits he completed.";
        else if (intent === "play") promptText = "play";
        
        const reply = await processUserMessage(promptText);
        hideTyping();
        appendMsg(reply);
    });
    
    // Dynamic Scroll Listeners for scroll bottom button
    body.addEventListener("scroll", () => {
        const isScrolledUp = body.scrollHeight - body.scrollTop - body.clientHeight > 120;
        if (isScrolledUp) {
            scrollBottomBtn.classList.add("visible");
        } else {
            scrollBottomBtn.classList.remove("visible");
        }
    });
    
    scrollBottomBtn.addEventListener("click", () => {
        body.scrollTop = body.scrollHeight;
    });
    
    // Event delegation for dynamically added msg actions (Speak and Copy)
    body.addEventListener("click", (e) => {
        const speakBtn = e.target.closest(".deip-speak-btn");
        const copyBtn = e.target.closest(".deip-copy-btn");
        
        if (speakBtn) {
            speakText(speakBtn.getAttribute("data-text"));
        } else if (copyBtn) {
            copyToClipboard(copyBtn.getAttribute("data-text"), copyBtn);
        }
    });
};

// Initialize
const init = () => {
    injectStyles();
    injectHTML();
    setupListeners();
    initSpeechBubblePrompts();
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
