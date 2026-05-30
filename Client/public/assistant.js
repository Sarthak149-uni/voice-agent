(function () {


    // userData

    const script = document.currentScript;

    const userId = script?.dataset?.userId

    const theme = "dark"

    let assistantConfig = null


    // load CSS

    const link = document.createElement("link")

    link.rel = "stylesheet"

    link.href = "http://localhost:5173/assistant.css"

    document.head.appendChild(link)


    // Create PopUp

    const popup = document.createElement("div")

    popup.className = `ellira-popup theme-${theme}`

    popup.innerHTML = `
    <div class="ellira-overlay"></div>

    <div class="ellira-content">

       <div class="ellira-top">
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
               src="http://localhost:5173/mic.svg"
               alt="mic"
               class="ellira-mic-icon"/>
            </button>
        </div>
    </div>
    
    `;

    document.body.appendChild(popup);

    // floating Button

    const button = document.createElement("button")

    button.className = `ellira-btn theme-${theme}`

    button.innerHTML = `
    <img 
    src="http://localhost:5173/logo.png"
    alt="logo"
    />`;
    document.body.appendChild(button)




    // toggle popup

    let open = false

    button.onclick = () => {
        open = !open;
        popup.style.display = open ? "flex" : "none";
    }


    // load Assistant

    const loadAssistant = async () => {
        try {
            const res = await fetch(`http://localhost:8000/api/assistant/config/${userId}`)

            const data = await res.json()

            if (data) {
                assistantConfig = data.user
                applyConfig()
            }

        } catch (error) {
            console.log(
                "Assistant Load Error:",
                error
            );
        }
    }


    const applyConfig = () => {
        if (!assistantConfig) return;

        popup.className = `ellira-popup theme-${assistantConfig.theme}`

        button.className = `ellira-btn theme-${assistantConfig.theme}`

        const title = popup.querySelector(".ellira-title")

        title.innerHTML = `Hello! I'm ${assistantConfig.assistantName}`;

        const subTitle = popup.querySelector(".ellira-sub")
        subTitle.innerHTML = `
    Welcome to
    ${assistantConfig.businessName}.
    <br />
    Ask anything about your website.
  `;


    }

    loadAssistant()


    // Element


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



    // text-speech

    const speak = (text) => {
        window.speechSynthesis.cancel();

        // Show AI response
        aiText.innerText =
            text;

        status.innerText =
            "AI Speaking...";

        const speech = new SpeechSynthesisUtterance(text)

        speech.lang =
            "hi-IN";

        speech.rate = 1;

        speech.pitch = 1;

        speech.volume = 1;

        // Voice end
        speech.onend = () => {

            status.innerText =
                "Tap button to Speak";

            wave.style.opacity =
                "0";
        };

        // Start speaking
        window.speechSynthesis.speak(
            speech
        );
    }


    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition


    if(SpeechRecognition){

        const recognition = new SpeechRecognition();

        recognition.lang =
      "en-US";

    recognition.continuous =
      false;

    recognition.interimResults =
      false;


      mic.onclick=()=>{
        wave.style.opacity =
        "1";

      status.innerText =
        "Listening...";

      userText.innerText =
        "";

      aiText.innerText =
        "";

      recognition.start();
      }


      recognition.onresult = (e)=>{
        const text = e.results[0][0].transcript

        userText.innerText = "You: " + text;

        recognition.stop();


        setTimeout( async () => {
            try {
                status.innerText = "Thinking...";
                

                const res = await fetch("http://localhost:8000/api/assistant/ask" , {
                    method:"POST",
                    headers:{
                        "Content-Type":
                      "application/json",
                    } ,
                    body:JSON.stringify({
                        message:text,
                        userId
                    })
                })

                const data = await res.json()
                console.log(data)

                if(data.success){

                    if(data.action === "navigate"){
                        speak(data.response)

                        setTimeout(()=>{
                            window.location.href = data.path

                        },1500)

                    }else{
                        speak(data.aiResponse)
                    }

                }else{
                    speak("Response Error please Check your plan")

                }



            } catch (error) {
                console.log(error)
                speak("AI Server Error")
                
            }
        },600)
      };

      recognition.onerror = ()=>{
        status.innerText =
          "Tap button to Speak";

        wave.style.opacity =
          "0";
      }


    }
    else{
        status.innerText =
      "Speech Recognition not supported";
    }


})();