import { useEffect, useState, useCallback } from "react";
import ReactGA from "react-ga4";
import ActiveCallDetail from "./components/ActiveCallDetail";
import { RainbowButton } from "./components/ui/rainbow-button";
import EmailLockScreen from "./components/EmailLockScreen";
import FlickeringBackground from "./components/FlickeringBackground";
import { CpuArchitecture } from "./components/ui/cpu-architecture.jsx";
import { GlowingEffect } from "./components/ui/glowing-effect";
import Vapi from "@vapi-ai/web";

// Initialize Google Analytics
ReactGA.initialize('G-ZZCN97TCYL', {
  debug: true,
  titleCase: false,
  gaOptions: {
    sendPageView: true
  }
});

// Put your Vapi Public Key below.
const VAPI_PUBLIC_KEY = "ed768954-311b-4532-920d-ff3a635c3e8f";
const vapi = new Vapi(VAPI_PUBLIC_KEY);

// Initial assistants mapping
const initialAssistants = {
  "kira": "438a05de-9605-437d-9dbd-4282074730dc"
};

// Helper to safely get the selected assistant from URL
const getSelectedAssistantFromUrl = () => {
  try {
    const path = window.location.pathname.replace("/", "");
    return path ? decodeURIComponent(path.toLowerCase()) : "kira";
  } catch (error) {
    console.error("Error parsing URL parameter:", error);
    return "kira"; // Fallback to default
  }
};

const App = () => {
  // State management
  const [assistants, setAssistants] = useState(initialAssistants);
  const [callState, setCallState] = useState({
    connecting: false,
    connected: false
  });
  const [userEmail, setUserEmail] = useState(localStorage.getItem('userEmail') || '');
  const [assistantState, setAssistantState] = useState({
    isSpeaking: false,
    volumeLevel: 0
  });
  
  // Get the selected assistant from URL
  const selected = getSelectedAssistantFromUrl();

  // Fetch additional assistants if not using the default "kira"
  useEffect(() => {
    if (selected !== "kira") {
      fetch("https://omni.keyreply.com/v1/api/voiceAssistants")
        .then(res => {
          if (!res.ok) {
            throw new Error(`Failed to fetch assistants: ${res.status}`);
          }
          return res.json();
        })
        .then(list => {
          const newAssistants = { ...initialAssistants };
          list.forEach(assistant => {
            newAssistants[assistant.name.toLowerCase()] = assistant.id;
          });
          setAssistants(newAssistants);
        })
        .catch(error => {
          console.error("Error fetching assistants:", error);
        });
    }
  }, [selected]);

  // Set up Vapi event listeners
  useEffect(() => {
    const handleCallStart = () => {
      setCallState({ connecting: false, connected: true });
    };
    
    const handleCallEnd = () => {
      setCallState({ connecting: false, connected: false });
    };
    
    const handleSpeechStart = () => {
      setAssistantState(prev => ({ ...prev, isSpeaking: true }));
    };
    
    const handleSpeechEnd = () => {
      setAssistantState(prev => ({ ...prev, isSpeaking: false }));
    };
    
    const handleVolumeLevel = (level) => {
      setAssistantState(prev => ({ ...prev, volumeLevel: level }));
    };
    
    const handleError = (error) => {
      console.error("Vapi error:", error);
      setCallState({ connecting: false, connected: false });
      alert("Error connecting to server. Please check your network connection.");
    };

    // Register event handlers
    vapi.on("call-start", handleCallStart);
    vapi.on("call-end", handleCallEnd);
    vapi.on("speech-start", handleSpeechStart);
    vapi.on("speech-end", handleSpeechEnd);
    vapi.on("volume-level", handleVolumeLevel);
    vapi.on("error", handleError);

    // Cleanup function to remove event listeners
    return () => {
      vapi.off("call-start", handleCallStart);
      vapi.off("call-end", handleCallEnd);
      vapi.off("speech-start", handleSpeechStart);
      vapi.off("speech-end", handleSpeechEnd);
      vapi.off("volume-level", handleVolumeLevel);
      vapi.off("error", handleError);
    };
  }, []);

  // Track page view on component mount
  useEffect(() => {
    ReactGA.send({
      hitType: "pageview",
      page: window.location.pathname,
      title: "Voice Demo"
    });
    console.log("Page view sent to GA");
  }, []);

  const handleEmailSubmit = (email) => {
    setUserEmail(email);
    localStorage.setItem('userEmail', email);
    ReactGA.event({
      category: "User",
      action: "Email Submitted",
      label: email
    });
    console.log("Email submit event sent to GA:", email);
  };

  // Call handlers
  const startCall = useCallback(() => {
    const assistantId = assistants[selected];
    if (assistantId) {
      setCallState(prev => ({ ...prev, connecting: true }));
      vapi.start(assistantId, {
        variableValues: {
          name: userEmail,
          email: userEmail
        }
      });
      
      // Track demo call start
      ReactGA.event({
        category: "VoiceDemo",
        action: "Start Call",
        label: userEmail
      });
      
      // Send custom dimension for assistant name
      ReactGA.gtag('set', 'assistant_name', selected);
      console.log("Call start event sent to GA:", userEmail, selected);
      
      // Send notification to Microsoft Teams webhook
      fetch('https://prod-184.westus.logic.azure.com:443/workflows/8ac9ed7498a04a98bd399619d53761e1/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=TgZkQtNjUUQiL4v4nvAieMZ1wXi6ZBp_spqKc3IBaXQ', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          "type": "message",
          "attachments": [
            {
              "contentType": "application/vnd.microsoft.card.adaptive",
              "content": {
                "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                "type": "AdaptiveCard",
                "version": "1.2",
                "body": [
                  {
                    "type": "TextBlock",
                    "size": "Medium",
                    "weight": "Bolder",
                    "text": "🎙️ New Voice Demo Call Started"
                  },
                  {
                    "type": "FactSet",
                    "facts": [
                      {
                        "title": "Email",
                        "value": userEmail
                      },
                      {
                        "title": "Assistant",
                        "value": selected
                      },
                      {
                        "title": "Time",
                        "value": new Date().toLocaleString()
                      },
                      {
                        "title": "Source",
                        "value": window.location.href
                      }
                    ]
                  }
                ]
              }
            }
          ]
        })
      })
      .then(response => {
        if (response.ok) {
          console.log('Teams notification sent successfully');
        } else {
          console.error('Failed to send Teams notification:', response.status);
        }
      })
      .catch(error => {
        console.error('Error sending Teams notification:', error);
      });

      if (selected === "kira") {
        setTimeout(() => {
          setCallState({ connecting: false, connected: true });
        }, 2500);
      }
    } else {
      console.warn(`Assistant ID not found for "${selected}"`);
    }
  }, [assistants, selected, userEmail]);

  const endCall = useCallback(() => {
    vapi.stop();
  }, []);

  // Render helper functions for cleaner JSX
  const renderCallButton = () => {
    if (callState.connected) {
      return <RainbowButton onClick={endCall} className="text-white">End Call</RainbowButton>;
    }
    
    if (callState.connecting) {
      return <RainbowButton className="text-white">Connecting...</RainbowButton>;
    }
    
    const label = selected === "kira" ? "kira™" : selected.toUpperCase();
    return (
      <div className="relative">
        <div className="w-[200px] h-[100px] mx-auto mb-4">
          <CpuArchitecture 
            text={"Kira™"}
            animateText={true}
            animateLines={true}
            animateMarkers={true}
            showCpuConnections={true}
          />
        </div>
        <RainbowButton onClick={startCall} className="text-white">
          Talk to <span className="text-[#37CFFF]">{label}</span>
        </RainbowButton>
      </div>
    );
  };

  const renderCallInterface = () => {
    const isKira = selected.toUpperCase() === "KIRA";
    
    if (callState.connected && !isKira) {
      return (
        <ActiveCallDetail
          assistantIsSpeaking={assistantState.isSpeaking}
          volumeLevel={assistantState.volumeLevel}
          onEndCallClick={endCall}
        />
      );
    }
    
    return renderCallButton();
  };

  return (
    <div className="mx-auto h-screen overflow-hidden">
      {!userEmail && <EmailLockScreen onSubmit={handleEmailSubmit} />}
      <FlickeringBackground />
      <div className="flex items-center flex-col justify-center px-2 md:px-10 py-4 w-full h-screen relative z-10">
        <div className="relative bg-gray-900 bg-opacity-60 p-8 rounded-xl border border-gray-700 shadow-2xl backdrop-blur-sm max-w-md w-full">
          <GlowingEffect
            spread={40}
            glow={true}
            disabled={false}
            proximity={64}
            inactiveZone={0.01}
            borderWidth={3}
          />
          <div className="mb-6 text-center">
            <h2 className="text-3xl font-bold text-white mb-2">AI Voice Assistant</h2>
            <p className="text-blue-300 text-sm">Experience the future of conversation</p>
          </div>
          <div className="text-white font-bold text-center">
            {renderCallInterface()}
          </div>
        </div>
      </div>
    </div>   
  );
};

export default App;
