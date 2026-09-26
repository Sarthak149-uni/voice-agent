(function () {

    // ── Resolve base URLs from script tag ──
    const script = document.currentScript;
    const userId = script?.dataset?.userId;
    const BASE_URL = new URL(script.src).origin;
    const API_URL = script?.dataset?.apiUrl || BASE_URL.replace(/:\d+$/, ':8000');

    const theme = "dark";
    let assistantConfig = null;


    // ── Load CSS ──
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `${BASE_URL}/assistant.css`;
    document.head.appendChild(link);


    // ── Create Popup ──
    const popup = document.createElement("div");
    popup.className = `ellira-popup theme-${theme}`;
    popup.innerHTML = `
    <div class="ellira-overlay"></div>

    <div class="ellira-content">

       <div class="ellira-top">

            <button class="ellira-close" aria-label="Close assistant">&times;</button>

            <div class="ellira-orb-wrap">

                <div class="ellira-orb-glow"></div>

                <div class="ellira-orb"></div>

            </div>

            <h2 class="ellira-title">
                Hello! I'm ellira AI
            </h2>

            <p class="ellira-sub">
                Your smart voice assistant.
                <br />
                Ask anything about your website.
            </p>


            <div class="ellira-status">
                Tap button to Speak
            </div>

            <div class="ellira-wave">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
            </div>

            <!-- User Text -->
            <div class="ellira-user-text">
            </div>

            <!-- AI Text -->
            <div class="ellira-ai-text">
            </div>
  
        </div>


        <div class="ellira-bottom">
            
            <button class="ellira-mic">

               <img 
               src="${BASE_URL}/mic.svg"
               alt="mic"
               class="ellira-mic-icon"/>
            </button>
        </div>
    </div>
    
    `;

    document.body.appendChild(popup);

    // ── Floating Button ──
    const button = document.createElement("button");
    button.className = `ellira-btn theme-${theme}`;
    button.innerHTML = `
    <img 
    src="${BASE_URL}/logo.png"
    alt="logo"
    />`;
    document.body.appendChild(button);


    // ── Toggle Popup ──
    let open = false;

    const togglePopup = (forceState) => {
        open = typeof forceState === 'boolean' ? forceState : !open;
        popup.style.display = open ? "flex" : "none";
    };

    button.onclick = () => togglePopup();

    // ── Close Button ──
    const closeBtn = popup.querySelector(".ellira-close");
    if (closeBtn) {
        closeBtn.onclick = () => togglePopup(false);
    }

    // ── Escape Key ──
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && open) {
            togglePopup(false);
        }
    });

    // ── Overlay Click to Close ──
    const overlay = popup.querySelector(".ellira-overlay");
    if (overlay) {
        overlay.onclick = () => togglePopup(false);
    }


    // ── Load Assistant Config ──
    const loadAssistant = async () => {
        try {
            const res = await fetch(`${API_URL}/api/assistant/config/${userId}`);

            if (!res.ok) {
                throw new Error(`Config fetch failed: ${res.status}`);
            }

            const data = await res.json();

            if (data) {
                assistantConfig = data.user;
                applyConfig();
            }

        } catch (error) {
            console.error(
                "Assistant Load Error:",
                error.message
            );
        }
    };


    const applyConfig = () => {
        if (!assistantConfig) return;

        popup.className = `ellira-popup theme-${assistantConfig.theme}`;

        button.className = `ellira-btn theme-${assistantConfig.theme}`;

        const title = popup.querySelector(".ellira-title");

        title.innerHTML = `Hello! I'm ${assistantConfig.assistantName}`;

        const subTitle = popup.querySelector(".ellira-sub");
        subTitle.innerHTML = `
    Welcome to
    ${assistantConfig.businessName}.
    <br />
    Ask anything about your website.
  `;


    };

    loadAssistant();


    // ── DOM Elements ──

    const status =
        popup.querySelector(
            ".ellira-status"
        );

    const wave =
        popup.querySelector(
            ".ellira-wave"
        );

    const userText =
        popup.querySelector(
            ".ellira-user-text"
        );

    const aiText =
        popup.querySelector(
            ".ellira-ai-text"
        );

    const mic =
        popup.querySelector(
            ".ellira-mic"
        );



    // ── Voice Selection ──
    // Pick the best available English voice. Prefer high-quality Google voices,
    // then any en-US voice, then any English voice, then the default.

    let selectedVoice = null;

    const pickBestVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        if (!voices.length) return;

        // Priority order for natural-sounding English voices
        const preferred = [
            "Google US English",
            "Google UK English Female",
            "Google UK English Male",
            "Microsoft Zira",
            "Microsoft David",
            "Samantha",        // macOS
            "Alex",            // macOS
            "Daniel",          // macOS UK
        ];

        // Try preferred voices first
        for (const name of preferred) {
            const v = voices.find(
                (voice) => voice.name === name
            );
            if (v) { selectedVoice = v; return; }
        }

        // Fallback: any en-US voice
        const enUS = voices.find(
            (v) => v.lang === "en-US"
        );
        if (enUS) { selectedVoice = enUS; return; }

        // Fallback: any English voice
        const en = voices.find(
            (v) => v.lang && v.lang.startsWith("en")
        );
        if (en) { selectedVoice = en; return; }

        // Last resort: first available voice
        selectedVoice = voices[0];
    };

    // Voices load asynchronously in most browsers
    pickBestVoice();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = pickBestVoice;
    }


    // ── Text-to-Speech ──
    // Splits long text into sentence chunks so the browser TTS engine
    // doesn't choke, skip words, or go silent mid-speech (common Chrome bug).

    const splitIntoChunks = (text) => {
        // Split on sentence boundaries while keeping the delimiter
        const raw = text.match(/[^.!?]+[.!?]+\s*/g);

        // If no sentence punctuation, return the whole text as one chunk
        if (!raw || raw.length === 0) return [text];

        // Merge tiny fragments so we don't get choppy playback
        const chunks = [];
        let buffer = "";

        for (const part of raw) {
            buffer += part;
            if (buffer.length >= 40) {
                chunks.push(buffer.trim());
                buffer = "";
            }
        }

        if (buffer.trim()) chunks.push(buffer.trim());
        return chunks;
    };

    let isSpeaking = false;
    let speakQueue = [];
    let chromeWatchdog = null;

    const speakNextChunk = () => {
        // Clear any previous watchdog
        if (chromeWatchdog) { clearInterval(chromeWatchdog); chromeWatchdog = null; }

        if (speakQueue.length === 0) {
            isSpeaking = false;
            status.innerText = "Tap button to Speak";
            wave.style.opacity = "0";
            return;
        }

        const chunk = speakQueue.shift();
        const utterance = new SpeechSynthesisUtterance(chunk);

        // Use the selected English voice
        if (selectedVoice) utterance.voice = selectedVoice;

        utterance.lang = "en-US";
        utterance.rate = 0.95;    // Slightly slower for clarity
        utterance.pitch = 1.0;
        utterance.volume = 1;

        utterance.onend = () => {
            if (chromeWatchdog) { clearInterval(chromeWatchdog); chromeWatchdog = null; }
            speakNextChunk();
        };

        utterance.onerror = (e) => {
            console.error("TTS error:", e.error);
            if (chromeWatchdog) { clearInterval(chromeWatchdog); chromeWatchdog = null; }
            speakNextChunk();
        };

        window.speechSynthesis.speak(utterance);

        // Chrome pauses/stops TTS after ~15s of continuous speech.
        // This watchdog resumes it if the engine stalls.
        chromeWatchdog = setInterval(() => {
            if (window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
                window.speechSynthesis.pause();
                window.speechSynthesis.resume();
            }
        }, 10000);
    };


    const speak = (text) => {
        // Cancel anything currently playing
        window.speechSynthesis.cancel();
        if (chromeWatchdog) { clearInterval(chromeWatchdog); chromeWatchdog = null; }

        // Show AI response
        aiText.innerText = text;
        status.innerText = "AI Speaking...";
        wave.style.opacity = "1";

        // Queue sentence chunks
        isSpeaking = true;
        speakQueue = splitIntoChunks(text);
        speakNextChunk();
    };


    // ── Speech Recognition ──

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;


    if (SpeechRecognition) {

        const recognition = new SpeechRecognition();

        recognition.lang = "en-US";

        recognition.continuous = false;

        recognition.interimResults = false;


        mic.onclick = () => {
            // Stop any ongoing speech before listening
            window.speechSynthesis.cancel();
            if (chromeWatchdog) { clearInterval(chromeWatchdog); chromeWatchdog = null; }
            isSpeaking = false;
            speakQueue = [];

            wave.style.opacity = "1";

            status.innerText = "Listening...";

            userText.innerText = "";

            aiText.innerText = "";

            recognition.start();
        };


        recognition.onresult = (e) => {
            const text = e.results[0][0].transcript;

            userText.innerText = "You: " + text;

            recognition.stop();


            setTimeout(async () => {
                try {
                    status.innerText = "Thinking...";
                    wave.style.opacity = "0";

                    const res = await fetch(`${API_URL}/api/assistant/ask`, {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body: JSON.stringify({
                            message: text,
                            userId
                        })
                    });

                    if (!res.ok) {
                        throw new Error(`API error: ${res.status}`);
                    }

                    const data = await res.json();

                    if (data.success) {

                        if (data.action === "navigate") {
                            speak(data.response);

                            setTimeout(() => {
                                window.location.href = data.path;

                            }, 2000);

                        } else {
                            speak(data.aiResponse);
                        }

                    } else {
                        speak("Sorry, there was an error. Please check your plan.");

                    }



                } catch (error) {
                    console.error("Assistant API Error:", error.message);
                    speak("Unable to reach the AI server. Please try again.");

                }
            }, 300);
        };

        recognition.onerror = (e) => {
            console.error("Speech recognition error:", e.error);
            status.innerText =
                "Tap button to Speak";

            wave.style.opacity =
                "0";
        };


    }
    else {
        status.innerText =
            "Speech Recognition not supported";
    }


})();