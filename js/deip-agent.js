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
3. Projects & Links (always suggest these links when asked about projects):
   - Institutional Risk Engine: Real-time Basel III & IFRS 9 stress dashboard (located at '/risk-analytics-dashboard/').
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
    // If we are in resume or cases subdirectory, we need to go up one level
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
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            animation: deip-bob 4s ease-in-out infinite;
        }
        
        #deip-bubble:hover {
            transform: scale(1.08);
            border-color: #f3c96e;
            box-shadow: 0 10px 30px rgba(223, 177, 91, 0.65);
        }
        
        #deip-bubble.thinking {
            animation: deip-wiggle 0.5s linear infinite;
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
            50% { transform: translateY(-10px) scaleX(0.95); }
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
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
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
            width: 370px;
            height: 500px;
            border-radius: 16px;
            background: rgba(252, 250, 242, 0.96);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border: 2px solid #2d5a27;
            box-shadow: 0 10px 40px rgba(45, 90, 39, 0.25);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            z-index: 9998;
            opacity: 0;
            transform: translateY(20px) scale(0.95);
            pointer-events: none;
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            font-family: 'Outfit', sans-serif;
        }
        
        #deip-chat-box.open {
            opacity: 1;
            transform: translateY(0) scale(1);
            pointer-events: auto;
        }
        
        /* Chat Header */
        .deip-header {
            padding: 16px 20px;
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
            width: 32px;
            height: 32px;
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
        .deip-close-btn {
            background: none;
            border: none;
            color: #faf6eb;
            cursor: pointer;
            font-size: 18px;
            transition: color 0.2s;
        }
        .deip-close-btn:hover { color: #dfb15b; }
        
        /* Messages Body */
        .deip-body {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 14px;
            background-color: #fbf9f1;
        }
        
        .deip-msg {
            max-width: 82%;
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
            align-self: flex-start;
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
            align-self: flex-end;
            border-bottom-right-radius: 2px;
            box-shadow: 0 3px 10px rgba(45, 90, 39, 0.15);
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
            <button class="deip-close-btn" id="deip-close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        
        <div class="deip-body" id="deip-body">
            <div class="deip-msg deip-msg-agent">
                Greetings traveler! 🌲 I am <strong>Deip</strong>, a Ghibli helper spirit. I float around Dipayan's garden. Ask me anything about his statistics background, risk career, or let's play a risk trivia game!
            </div>
        </div>
        
        <div class="deip-quick-prompts" id="deip-prompts">
            <button class="deip-prompt-btn" data-intent="career">Career Path 💼</button>
            <button class="deip-prompt-btn" data-intent="projects">Projects 🛠️</button>
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
    // Replace **bold** with <strong>bold</strong>
    let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Replace [link text](url) with relative-aware anchors
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, (match, label, url) => {
        // Adjust relative paths if user is in a subfolder
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
    
    // Replace newlines with <br>
    html = html.replace(/\n/g, '<br>');
    return html;
};

// Append message block
const appendMsg = (text, isUser = false) => {
    const body = document.getElementById("deip-body");
    const msg = document.createElement("div");
    msg.className = `deip-msg ${isUser ? 'deip-msg-user' : 'deip-msg-agent'}`;
    msg.innerHTML = isUser ? text : formatMarkdown(text);
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
    
    // Add thinking wiggle animation to mascot
    const bubble = document.getElementById("deip-bubble");
    if (bubble) bubble.classList.add("thinking");
};

const hideTyping = () => {
    if (typingIndicator) {
        typingIndicator.remove();
        typingIndicator = null;
    }
    const bubble = document.getElementById("deip-bubble");
    if (bubble) bubble.classList.remove("thinking");
};

// Local Rule-Based Fallback Parser (if API calls fail)
const localFallbackReply = (input) => {
    const clean = input.toLowerCase().trim();
    
    if (clean.includes("career") || clean.includes("work") || clean.includes("experience") || clean.includes("bny") || clean.includes("goldman") || clean.includes("morgan")) {
        return `*A rustle of forest leaves reveals Dipayan's credentials:*
- **BNY (VP, Risk & Compliance)**: May 2026 - Present. Deploys Azure multilingual KYC solutions.
- **Goldman Sachs (Associate)**: Nov 2024 - Apr 2026. Trade surveillance & insider trading model validation.
- **Morgan Stanley (Associate)**: Jan 2022 - Nov 2024. AML validations & transaction monitoring models.

*(Note: Currently running in offline fallback mode)*`;
    }
    
    if (clean.includes("project") || clean.includes("dashboard") || clean.includes("portfolio")) {
        return `*The spirits suggest exploring these pathways:*
1. **[Institutional Risk Engine](/risk-analytics-dashboard/)** - Dynamic Basel III LCR and Credit stress model dashboard.
2. **[Systemic Business Cases](/cases/)** - In-depth reports on Goldman Sachs, BNY, and Morgan Stanley validations.
3. **[Interactive Resume](/resume/)** - Details of stats background and work history.

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
    
    // 1. Check if trivia game is active
    if (gameActive) {
        return handleGameAnswer(clean);
    }
    
    // 2. Intent to play trivia
    if (clean === "play" || clean.includes("play trivia") || clean.includes("game")) {
        gameActive = true;
        gameQuestionIndex = 0;
        gameScore = 0;
        return `🎯 **Risk Analytics Trivia!** Let's test your quantitative risk knowledge. I have 3 questions for you.

**Question 1:** ${TRIVIA_QUESTIONS[0].q}
${TRIVIA_QUESTIONS[0].options.join('\n')}`;
    }
    
    // Add user message to history
    chatHistory.push({ role: "user", content: userInput });
    
    // Keep history bounded to avoid high context usage
    if (chatHistory.length > 15) {
        chatHistory = [
            chatHistory[0], // Keep system prompt
            ...chatHistory.slice(chatHistory.length - 10)
        ];
    }
    
    try {
        // Try Llama 4 scout model first
        try {
            const reply = await fetchGroqResponse(chatHistory, PRIMARY_MODEL);
            chatHistory.push({ role: "assistant", content: reply });
            return reply;
        } catch (scoutError) {
            console.warn("Primary Llama 4 Scout model failed. Attempting Llama 3.3 fallback...", scoutError);
            // Fallback to Llama 3.3
            const fallbackReply = await fetchGroqResponse(chatHistory, FALLBACK_MODEL);
            chatHistory.push({ role: "assistant", content: fallbackReply });
            return fallbackReply;
        }
    } catch (globalError) {
        console.error("All Groq API attempts failed. Falling back to local parser.", globalError);
        // Clean history of failed prompt
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
        "Ask me to explain IFRS 9 ECL calculations!",
        "Click me to play our Risk Trivia game! 🎯",
        "I can tell you about Dipayan's VP role at BNY!",
        "Ask me about his Goldman Sachs surveillance model work!",
        "Want to check his stats education at IIT Kanpur?"
    ];
    
    const showRandomPrompt = () => {
        if (chatOpen) return;
        
        const randomText = prompts[Math.floor(Math.random() * prompts.length)];
        bubbleText.innerText = randomText;
        bubbleText.classList.add("show");
        
        // Trigger a cute bounce animation on mascot
        mascot.style.animation = "deip-bounce 0.6s ease";
        setTimeout(() => {
            mascot.style.animation = "deip-bob 4s ease-in-out infinite";
        }, 650);
        
        // Hide after 6 seconds
        setTimeout(() => {
            bubbleText.classList.remove("show");
        }, 6000);
    };
    
    // Show first prompt after 3 seconds, then repeat every 30 seconds
    setTimeout(showRandomPrompt, 3000);
    speechBubbleTimer = setInterval(showRandomPrompt, 30000);
};

// Set up UI Event listeners
const setupListeners = () => {
    const bubble = document.getElementById("deip-bubble");
    const speechBubble = document.getElementById("deip-speech-bubble");
    const chatBox = document.getElementById("deip-chat-box");
    const closeBtn = document.getElementById("deip-close");
    const sendBtn = document.getElementById("deip-send");
    const inputField = document.getElementById("deip-input-field");
    const promptArea = document.getElementById("deip-prompts");
    
    const openChat = () => {
        chatOpen = true;
        chatBox.classList.add("open");
        speechBubble.classList.remove("show");
        inputField.focus();
    };
    
    const closeChat = () => {
        chatOpen = false;
        chatBox.classList.remove("open");
    };
    
    bubble.addEventListener("click", () => {
        if (chatOpen) closeChat();
        else openChat();
    });
    
    closeBtn.addEventListener("click", closeChat);
    
    // Hover triggers speech bubble quickly
    bubble.addEventListener("mouseenter", () => {
        if (!chatOpen) {
            speechBubble.classList.add("show");
        }
    });
    
    bubble.addEventListener("mouseleave", () => {
        // Give a delay to let the user read it
        setTimeout(() => {
            if (!chatOpen && speechBubble.classList.contains("show")) {
                speechBubble.classList.remove("show");
            }
        }, 1500);
    });
    
    const handleSend = async () => {
        const text = inputField.value.trim();
        if (text === "") return;
        
        appendMsg(text, true);
        inputField.value = "";
        
        showTyping();
        
        // Process message via Groq / Fallback
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
        if (!btn) return;
        
        const intent = btn.getAttribute("data-intent");
        appendMsg(btn.innerText, true);
        
        showTyping();
        
        let promptText = "";
        if (intent === "career") promptText = "Tell me about Dipayan's career history and VP role at BNY.";
        else if (intent === "projects") promptText = "What projects has Dipayan built? Give me the dashboard and resume links.";
        else if (intent === "cases") promptText = "Tell me about the systemic case studies and audits he completed.";
        else if (intent === "play") promptText = "play"; // triggers trivia game flow
        
        const reply = await processUserMessage(promptText);
        
        hideTyping();
        appendMsg(reply);
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
