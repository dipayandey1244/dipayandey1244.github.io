/**
 * Deip AI Agent - Interactive Client-side Chatbot
 * Self-contained module: Dynamically injects styling, structure, and state machine.
 */

// Global agent state
let chatOpen = false;
let gameActive = false;
let gameQuestionIndex = 0;
let gameScore = 0;

const TRIVIA_QUESTIONS = [
    {
        q: "Under Basel III guidelines, what is the strict regulatory minimum percentage for the Liquidity Coverage Ratio (LCR)?",
        options: ["A) 80%", "B) 100%", "C) 120%"],
        answer: 1, // index of option B
        ex: "Correct! LCR mandates holding enough HQLA to cover 100% of net cash outflows over a 30-day severe stress horizon."
    },
    {
        q: "Expected Shortfall (ES) is adopted in Basel III (FRTB) because it is a 'coherent' risk measure. Which property does VaR violate under fat tails?",
        options: ["A) Sub-additivity", "B) Monotonicity", "C) Translation Invariance"],
        answer: 0, // index of option A
        ex: "Spot on! VaR is not sub-additive, meaning merging two portfolios can mathematically yield a risk measurement greater than the sum of individual parts."
    },
    {
        q: "IFRS 9 Expected Credit Loss (ECL) requires transition from 12-month provisioning to Lifetime provisioning under which stage?",
        options: ["A) Stage 1 (Performing)", "B) Stage 2 (Underperforming / SICR)", "C) Stage 3 (Non-performing / Default)"],
        answer: 1, // index of option B
        ex: "Correct! Transition to Stage 2 occurs when there is a Significant Increase in Credit Risk (SICR), requiring full lifetime ECL provisioning."
    }
];

// Inline Styles Injection
const injectStyles = () => {
    const styleEl = document.createElement("style");
    styleEl.innerHTML = `
        /* Floating Chat Button */
        #deip-bubble {
            position: fixed;
            bottom: 24px;
            right: 24px;
            width: 54px;
            height: 54px;
            border-radius: 50%;
            background: linear-gradient(135deg, #6366f1, #38bdf8);
            border: 2px solid rgba(255,255,255,0.15);
            box-shadow: 0 0 20px rgba(99, 102, 241, 0.45);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 20px;
            cursor: pointer;
            z-index: 9999;
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        #deip-bubble:hover {
            transform: scale(1.1) rotate(15deg);
            box-shadow: 0 0 25px rgba(99, 102, 241, 0.65);
        }
        
        /* Chat Drawer */
        #deip-chat-box {
            position: fixed;
            bottom: 90px;
            right: 24px;
            width: 360px;
            height: 480px;
            border-radius: 16px;
            background: rgba(11, 17, 32, 0.85);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255,255,255,0.08);
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            z-index: 9998;
            opacity: 0;
            transform: translateY(20px) scale(0.95);
            pointer-events: none;
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        #deip-chat-box.open {
            opacity: 1;
            transform: translateY(0) scale(1);
            pointer-events: auto;
        }
        
        /* Chat Header */
        .deip-header {
            padding: 16px 20px;
            border-bottom: 1px solid rgba(255,255,255,0.08);
            background-color: rgba(255,255,255,0.02);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .deip-header-title {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .deip-status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: #10b981;
            box-shadow: 0 0 8px #10b981;
        }
        .deip-header-title h4 {
            font-size: 14px;
            font-weight: 700;
            color: #f8fafc;
            font-family: 'Outfit', sans-serif;
        }
        .deip-header-title span {
            font-size: 10px;
            color: #94a3b8;
            margin-left: 6px;
        }
        .deip-close-btn {
            background: none;
            border: none;
            color: #8e9cb2;
            cursor: pointer;
            font-size: 16px;
            transition: color 0.2s;
        }
        .deip-close-btn:hover { color: #f43f5e; }
        
        /* Messages Body */
        .deip-body {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 14px;
            font-family: 'Outfit', sans-serif;
        }
        
        .deip-msg {
            max-width: 80%;
            padding: 10px 14px;
            border-radius: 12px;
            font-size: 13px;
            line-height: 1.5;
            word-wrap: break-word;
        }
        .deip-msg-agent {
            background-color: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.05);
            color: #e2e8f0;
            align-self: flex-start;
            border-bottom-left-radius: 2px;
        }
        .deip-msg-user {
            background: linear-gradient(135deg, #6366f1, #4f46e5);
            color: #ffffff;
            align-self: flex-end;
            border-bottom-right-radius: 2px;
            box-shadow: 0 2px 10px rgba(99, 102, 241, 0.2);
        }
        
        /* Quick Prompt Options */
        .deip-quick-prompts {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            padding: 10px 20px;
            border-top: 1px solid rgba(255,255,255,0.04);
        }
        .deip-prompt-btn {
            background-color: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255,255,255,0.06);
            color: #94a3b8;
            padding: 6px 12px;
            border-radius: 16px;
            font-size: 11.5px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            font-family: 'Outfit', sans-serif;
        }
        .deip-prompt-btn:hover {
            color: #f8fafc;
            border-color: #6366f1;
            background-color: rgba(99, 102, 241, 0.15);
        }
        
        /* Input area */
        .deip-input-area {
            padding: 12px 20px 20px 20px;
            display: flex;
            gap: 8px;
            border-top: 1px solid rgba(255,255,255,0.08);
            background-color: rgba(0,0,0,0.15);
        }
        .deip-input {
            flex: 1;
            background-color: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: 8px;
            color: #f8fafc;
            padding: 8px 12px;
            font-size: 13px;
            font-family: 'Outfit', sans-serif;
        }
        .deip-input:focus {
            outline: none;
            border-color: #6366f1;
        }
        .deip-send-btn {
            background-color: #6366f1;
            border: none;
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background-color 0.2s;
        }
        .deip-send-btn:hover { background-color: #4f46e5; }
        
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
            background-color: #94a3b8;
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
    // 1. Bubble
    const bubble = document.createElement("div");
    bubble.id = "deip-bubble";
    bubble.innerHTML = `<i class="fa-solid fa-robot"></i>`;
    document.body.appendChild(bubble);
    
    // 2. Chat drawer
    const chatBox = document.createElement("div");
    chatBox.id = "deip-chat-box";
    chatBox.innerHTML = `
        <div class="deip-header">
            <div class="deip-header-title">
                <div class="deip-status-dot"></div>
                <h4>Deip Span</h4>
                <span>AI Agent</span>
            </div>
            <button class="deip-close-btn" id="deip-close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        
        <div class="deip-body" id="deip-body">
            <div class="deip-msg deip-msg-agent">
                Hi, I'm <strong>Deip</strong>, Dipayan's personal AI Agent. Ask me anything about his credentials, portfolio projects, business cases, or challenge me to a risk analytics trivia game!
            </div>
        </div>
        
        <div class="deip-quick-prompts" id="deip-prompts">
            <button class="deip-prompt-btn" data-intent="career">Career History</button>
            <button class="deip-prompt-btn" data-intent="projects">Projects Review</button>
            <button class="deip-prompt-btn" data-intent="cases">Case Studies</button>
            <button class="deip-prompt-btn" data-intent="play">Play Risk Trivia 🎯</button>
        </div>
        
        <div class="deip-input-area">
            <input type="text" class="deip-input" id="deip-input-field" placeholder="Type a message..." autocomplete="off">
            <button class="deip-send-btn" id="deip-send"><i class="fa-solid fa-paper-plane"></i></button>
        </div>
    `;
    document.body.appendChild(chatBox);
};

// Append message block
const appendMsg = (text, isUser = false) => {
    const body = document.getElementById("deip-body");
    const msg = document.createElement("div");
    msg.className = `deip-msg ${isUser ? 'deip-msg-user' : 'deip-msg-agent'}`;
    msg.innerHTML = text;
    body.appendChild(msg);
    body.scrollTop = body.scrollHeight;
};

// Show typing indicator
let typingIndicator = null;
const showTyping = () => {
    if (typingIndicator) return;
    const body = document.getElementById("deip-body");
    typingIndicator = document.createElement("div");
    typingIndicator.className = "deip-typing deip-msg-agent deip-msg";
    typingIndicator.innerHTML = `
        <div class="deip-dot"></div>
        <div class="deip-dot"></div>
        <div class="deip-dot"></div>
    `;
    body.appendChild(typingIndicator);
    body.scrollTop = body.scrollHeight;
};

const hideTyping = () => {
    if (typingIndicator) {
        typingIndicator.remove();
        typingIndicator = null;
    }
};

// Chat Responses Parsing
const generateReply = (input) => {
    const clean = input.toLowerCase().trim();
    
    // TRIVIA GAME LOGIC
    if (gameActive) {
        return handleGameAnswer(clean);
    }
    
    // Regular intents mapping
    if (clean.includes("game") || clean.includes("play") || clean.includes("trivia")) {
        gameActive = true;
        gameQuestionIndex = 0;
        gameScore = 0;
        return `🎯 <strong>Starting Risk Analytics Trivia!</strong> I'll ask you 3 questions about risk management models. Let's begin.<br><br><strong>Question 1:</strong> ${TRIVIA_QUESTIONS[0].q}<br><br>${TRIVIA_QUESTIONS[0].options.join('<br>')}`;
    }
    
    if (clean.includes("career") || clean.includes("work") || clean.includes("experience") || clean.includes("bny") || clean.includes("goldman") || clean.includes("morgan")) {
        return `Dipayan's credentials span top financial institutions:<br>
        - <strong>BNY (VP, Risk & Compliance)</strong>: May 2026 - Present. Leading generative AI validations and multi-lingual KYC pipelines.<br>
        - <strong>Goldman Sachs (Associate)</strong>: Nov 2024 - Apr 2026. Spearheaded market manipulation validations and LLM audit frameworks.<br>
        - <strong>Morgan Stanley (Associate)</strong>: Jan 2022 - Nov 2024. Lead validator on transaction monitoring and sanctions classification models.<br><br>
        Want details on his education or projects?`;
    }
    
    if (clean.includes("project") || clean.includes("dashboard") || clean.includes("portfolio")) {
        return `Dipayan has built several high-fidelity platforms:<br>
        1. <strong>Institutional Risk Engine</strong>: A real-time Basel III & IFRS 9 stress dashboard with slider inputs.<br>
        2. <strong>Ghibli Image Generator</strong>: Transposing scenic photos to animated watercolors.<br>
        3. <strong>Finance AI models</strong>: Deep-learning time-series forecasting models.<br><br>
        You can launch the Risk Engine directly from the homepage card!`;
    }
    
    if (clean.includes("education") || clean.includes("iit") || clean.includes("kanpur") || clean.includes("statistics") || clean.includes("study")) {
        return `Dipayan holds a master's degree (<strong>M.Sc. in Statistics</strong>) from the prestigious **Indian Institute of Technology (IIT), Kanpur** (2019-2021). This provides the deep statistical and mathematical rigor behind his model validations.`;
    }
    
    if (clean.includes("cases") || clean.includes("case study") || clean.includes("surveillance")) {
        return `I can review Dipayan's quantitative case studies:<br>
        1. <strong>Insider Trading surveillance</strong>: Reducing false positives by 64% using XGBoost alerts filtration.<br>
        2. <strong>LLM-as-a-Judge</strong>: Validating RAG frameworks using multi-agent consensus validation.<br>
        3. <strong>Spoofing model validation</strong>: Re-engineering LightGBM model matrices to eliminate look-ahead data leakage.<br><br>
        Read the full reports on the dedicated **Business Case Studies** tab!`;
    }
    
    if (clean.includes("contact") || clean.includes("email") || clean.includes("phone") || clean.includes("linkedin")) {
        return `Get in touch with Dipayan Dey:<br>
        - 📧 Email: <a href="mailto:dipayandey44@gmail.com" style="color: #38bdf8;">dipayandey44@gmail.com</a><br>
        - 📞 Phone: +91-7364969780<br>
        - 🌐 LinkedIn: <a href="https://linkedin.com/in/dipayandey12" target="_blank" style="color: #38bdf8;">linkedin.com/in/dipayandey12</a>`;
    }
    
    if (clean.includes("hello") || clean.includes("hi") || clean.includes("hey")) {
        return "Hey there! Feel free to ask me about Dipayan's career, education, case studies, or type 'play' to test your quantitative finance knowledge!";
    }
    
    return "Interesting question! Since I'm running client-side, I might not have the full context, but I can guide you through Dipayan's **Career**, **Projects**, or **Case Studies**. Type 'play' if you want to play the trivia game!";
};

// Trivia game processor
const handleGameAnswer = (cleanInput) => {
    const q = TRIVIA_QUESTIONS[gameQuestionIndex];
    let selectedIdx = -1;
    
    if (cleanInput.includes("a")) selectedIdx = 0;
    else if (cleanInput.includes("b")) selectedIdx = 1;
    else if (cleanInput.includes("c")) selectedIdx = 2;
    
    if (selectedIdx === -1) {
        return `Please select a valid option (A, B, or C) for this question:<br><br><strong>Question:</strong> ${q.q}`;
    }
    
    let resultMsg = "";
    if (selectedIdx === q.answer) {
        gameScore++;
        resultMsg = `<span style="color: #10b981; font-weight: 700;">✅ Correct!</span> ${q.ex}`;
    } else {
        resultMsg = `<span style="color: #f43f5e; font-weight: 700;">❌ Incorrect.</span> The correct answer was option ${String.fromCharCode(65 + q.answer)}.<br>${q.ex}`;
    }
    
    // Advance index
    gameQuestionIndex++;
    
    if (gameQuestionIndex < TRIVIA_QUESTIONS.length) {
        const nextQ = TRIVIA_QUESTIONS[gameQuestionIndex];
        return `${resultMsg}<br><br>---<br><br><strong>Question ${gameQuestionIndex + 1}:</strong> ${nextQ.q}<br><br>${nextQ.options.join('<br>')}`;
    } else {
        gameActive = false;
        const finalScore = gameScore;
        let rating = "Risk Apprentice 📈";
        if (finalScore === 3) rating = "Quantitative Director 🏆";
        else if (finalScore === 2) rating = "Senior Risk Specialist 📊";
        
        return `${resultMsg}<br><br>---<br><br>🎉 <strong>Trivia Game Finished!</strong><br>Your score: **${finalScore} / 3**<br>Risk Rating: <strong>${rating}</strong><br><br>Type 'play' to play again!`;
    }
};

// Set up UI Event listeners
const setupListeners = () => {
    const bubble = document.getElementById("deip-bubble");
    const chatBox = document.getElementById("deip-chat-box");
    const closeBtn = document.getElementById("deip-close");
    const sendBtn = document.getElementById("deip-send");
    const inputField = document.getElementById("deip-input-field");
    const promptArea = document.getElementById("deip-prompts");
    
    const toggleChat = () => {
        chatOpen = !chatOpen;
        if (chatOpen) {
            chatBox.classList.add("open");
            inputField.focus();
        } else {
            chatBox.classList.remove("open");
        }
    };
    
    bubble.addEventListener("click", toggleChat);
    closeBtn.addEventListener("click", toggleChat);
    
    const handleSend = () => {
        const text = inputField.value.trim();
        if (text === "") return;
        
        appendMsg(text, true);
        inputField.value = "";
        
        showTyping();
        setTimeout(() => {
            hideTyping();
            const reply = generateReply(text);
            appendMsg(reply);
        }, 800 + Math.random() * 400); // Dynamic typing delay
    };
    
    sendBtn.addEventListener("click", handleSend);
    inputField.addEventListener("keydown", (e) => {
        if (e.key === "Enter") handleSend();
    });
    
    // Quick prompts click handler
    promptArea.addEventListener("click", (e) => {
        const btn = e.target.closest(".deip-prompt-btn");
        if (!btn) return;
        
        const intent = btn.getAttribute("data-intent");
        appendMsg(btn.innerText, true);
        
        showTyping();
        setTimeout(() => {
            hideTyping();
            const reply = generateReply(intent);
            appendMsg(reply);
        }, 500);
    });
};

// Initialize
const init = () => {
    injectStyles();
    injectHTML();
    setupListeners();
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
