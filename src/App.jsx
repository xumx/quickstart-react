import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import ReactGA from "react-ga4";
import ActiveCallDetail from "./components/ActiveCallDetail";
import { RainbowButton } from "./components/ui/rainbow-button";
import EmailLockScreen from "./components/EmailLockScreen";
import FlickeringBackground from "./components/FlickeringBackground";
import { CpuArchitecture } from "./components/ui/cpu-architecture.jsx";
import { GlowingEffect } from "./components/ui/glowing-effect";
import Vapi from "@vapi-ai/web";
import { slugify, findBestAssistantId } from "./lib/nameMatch";

// Initialize Google Analytics
ReactGA.initialize('G-ZZCN97TCYL', {
  debug: true,
  titleCase: false,
  gaOptions: {
    sendPageView: true
  }
});

// slugify and findBestAssistantId now imported from ./lib/nameMatch

// Helper to safely get the selected assistant from URL
const getSelectedAssistantFromUrl = () => {
  try {
    // Take only the first non-empty segment for robustness: /foo/bar -> foo
    const firstSegment = window.location.pathname
      .split("/")
      .filter(Boolean)[0] || "";
    const raw = firstSegment ? decodeURIComponent(firstSegment) : "kira";
    return slugify(raw) || "kira";
  } catch (error) {
    console.error("Error parsing URL parameter:", error);
    return "kira"; // Fallback to default
  }
};


// Put your Vapi Public Key below.
const VAPI_PUBLIC_KEY = "ed768954-311b-4532-920d-ff3a635c3e8f";
const VAPI_PUBLIC_KEY_CHANGEBRIDGE = "5ffc3915-0259-4314-942c-616df3e79c8b";
const VAPI_PUBLIC_KEY_CARESHIELD = "f4b0d582-8723-4111-b354-c5e7bbe3a227"; // Galaxy

const VAPI_API_KEYS = {
  default: VAPI_PUBLIC_KEY,
  careshield: VAPI_PUBLIC_KEY_CARESHIELD,
  changebridge: VAPI_PUBLIC_KEY_CHANGEBRIDGE,
}

// Initial assistants mapping (store rich metadata)
const initialAssistants = {
  "kira": { id: "438a05de-9605-437d-9dbd-4282074730dc", name: "Kira" },
  "changebridge-dev": { id: "a212d3f9-0586-4608-ba53-dbae8b9a30a1", name: "Changebridge Medical Associates" },
  "changebridge-workflow": { id: "2a17ccc1-9189-4914-bab6-3b8284b04afc", name: "Changebridge Medical Associates" },
  "changebridge-max": { id: "0b8fb0fb-edb9-4d24-9e0a-fee26ed1bdda", name: "Changebridge Medical Associates" },
  "changebridge": { id: "0b8fb0fb-edb9-4d24-9e0a-fee26ed1bdda", name: "Changebridge Medical Associates" },
  "careshield": { id: "413e971a-ee4f-4b6b-a029-4de6d05862bf", name: "Careshield" }
};


const App = () => {
  // State management
  const [assistants, setAssistants] = useState(initialAssistants);
  const [callState, setCallState] = useState({
    connecting: false,
    connected: false
  });
  const [resolveError, setResolveError] = useState("");
  const [assistantsLoading, setAssistantsLoading] = useState(false);
  const [userEmail, setUserEmail] = useState(localStorage.getItem('userEmail') || '');
  const [assistantState, setAssistantState] = useState({
    isSpeaking: false,
    volumeLevel: 0
  });
  
  // Get the selected assistant from URL
  const selected = getSelectedAssistantFromUrl();

  // Vapi instance depends on selected; manage with ref and effect
  const vapiRef = useRef(null);
  useEffect(() => {
    const key = selected.includes("changebridge") ? VAPI_API_KEYS.changebridge : (selected.includes("careshield") ? VAPI_API_KEYS.careshield : VAPI_API_KEYS.default);
    const v = new Vapi(key);
    vapiRef.current = v;

    // Register event handlers on this instance
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
      // Prefer inline error over alert for UX; keep alert if you still want a popup
      setResolveError("Connection error. Please try again.");
    };

    v.on("call-start", handleCallStart);
    v.on("call-end", handleCallEnd);
    v.on("speech-start", handleSpeechStart);
    v.on("speech-end", handleSpeechEnd);
    v.on("volume-level", handleVolumeLevel);
    v.on("error", handleError);

    return () => {
      v.off("call-start", handleCallStart);
      v.off("call-end", handleCallEnd);
      v.off("speech-start", handleSpeechStart);
      v.off("speech-end", handleSpeechEnd);
      v.off("volume-level", handleVolumeLevel);
      v.off("error", handleError);
    };
  }, [selected]);

  // Build a derived map slug -> id for matching, keep assistants as rich metadata
  const assistantIdMap = useMemo(() => {
    const entries = Object.entries(assistants).map(([slug, meta]) => [slug, meta?.id]);
    return Object.fromEntries(entries);
  }, [assistants]);

  // Compute resolved assistant ID (exact or fuzzy) and track error state
  const resolvedAssistantId = useMemo(() => {
    const id = assistantIdMap[selected] || findBestAssistantId(assistantIdMap, selected);
    return id;
  }, [assistantIdMap, selected]);

  // Also compute resolved slug and name for UI/analytics
  const resolvedAssistantSlug = useMemo(() => {
    if (!resolvedAssistantId) return undefined;
    return Object.entries(assistantIdMap).find(([, id]) => id === resolvedAssistantId)?.[0];
  }, [assistantIdMap, resolvedAssistantId]);

  const resolvedAssistantName = useMemo(() => {
    return resolvedAssistantSlug ? assistants[resolvedAssistantSlug]?.name : undefined;
  }, [assistants, resolvedAssistantSlug]);

  useEffect(() => {
    if (!resolvedAssistantId && !assistantsLoading) {
      setResolveError("There is no assistant matching this URL.");
    } else {
      setResolveError("");
    }
  }, [resolvedAssistantId, assistantsLoading]);

  // Fetch additional assistants if not using the default "kira"
  useEffect(() => {
    if (selected !== "kira") {
      setAssistantsLoading(true);
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
            const key = slugify(assistant.name);
            if (key) newAssistants[key] = { id: assistant.id, name: assistant.name };
          });
          setAssistants(newAssistants);
        })
        .catch(error => {
          console.error("Error fetching assistants:", error);
          setResolveError("Couldn't load assistants. Please refresh or try again.");
        })
        .finally(() => setAssistantsLoading(false));
    }
  }, [selected]);

  // (Legacy listener effect removed; listeners are now bound in the ref-based effect above.)

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

  const startWorkflow = async(workflowId) => {
    const assistantId = null;
    const overrides = null;
    const squadId = null;
    const vapi = vapiRef.current;
    const call = await vapi.start(assistantId, overrides, squadId, workflowId, {
      variableValues: {
        name: userEmail,
        email: userEmail
      }
    });

    return call;
  }

  const startAssistant = async(assistantId) => {
    const vapi = vapiRef.current;
    const call = await vapi.start(assistantId, {
      variableValues: {
        name: userEmail,
        email: userEmail
      }
    });

    return call;
  }

  // Call handlers
  const startCall = useCallback(async () => {
    const assistantId = resolvedAssistantId;
    if (assistantId) {
      setCallState(prev => ({ ...prev, connecting: true }));
      try {
        // Start the call and get the call object with ID
        const call = (selected == "changebridge-workflow") ? await startWorkflow(assistantId) : await startAssistant(assistantId);
        
        // Get call ID from the call object
        const callId = call?.id || 'unknown';
      
      // Track demo call start
      ReactGA.event({
        category: "VoiceDemo",
        action: "Start Call",
        label: userEmail
      });
      
      // Send custom dimension for assistant name (use resolved display name if available)
      ReactGA.gtag('set', 'assistant_name', resolvedAssistantName || selected);
      console.log("Call start event sent to GA:", userEmail, selected);
      
      if (!userEmail.includes("@keyreply.com")) {
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
                          "title": "Call ID",
                          "value": callId
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
                    },
                    {
                      "type": "ActionSet",
                      "actions": [
                        {
                          "type": "Action.OpenUrl",
                          "title": "Download Recording",
                          "url": `https://dashboard.vapi.ai/calls/${callId}`
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
      }

      if (selected === "kira") {
        setTimeout(() => {
          setCallState({ connecting: false, connected: true });
        }, 2500);
      }
      } catch (err) {
        console.error('Failed to start call:', err);
        setCallState({ connecting: false, connected: false });
        setResolveError('Failed to start call. Please try again.');
        return;
      }
    } else {
      console.warn(`Assistant ID not found for "${selected}"`);
      setResolveError("Assistant not found. Please check the URL or try a different one.");
    }
  }, [resolvedAssistantId, selected, userEmail]);

  const endCall = useCallback(() => {
    const vapi = vapiRef.current;
    if (vapi) vapi.stop();
  }, []);

  // Render helper functions for cleaner JSX
  const renderCallButton = () => {
    if (callState.connected) {
      return <RainbowButton onClick={endCall} className="text-white">End Call</RainbowButton>;
    }
    
    if (callState.connecting) {
      return (
        <RainbowButton className="text-white" disabled aria-busy="true" aria-live="polite">
          <span className="inline-flex items-center gap-2">
            <span className="rainbow-spinner h-5 w-5" aria-hidden="true" />
            <span className="animate-pulse rainbow-text">Connecting...</span>
          </span>
        </RainbowButton>
      );
    }
    
    const labelBase = resolvedAssistantName || selected;
    const label = "Start Call";
    const canCall = Boolean(resolvedAssistantId);
    return (
      <div className="relative">
        <div className="w-[250px] h-[100px] mx-auto mb-4">
          <CpuArchitecture 
            text={"Kira™"}
            animateText={true}
            animateLines={true}
            animateMarkers={true}
            showCpuConnections={true}
          />
        </div>
        <RainbowButton
          onClick={canCall ? startCall : undefined}
          disabled={!canCall}
          aria-disabled={!canCall}
          className={`text-white ${!canCall ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <span className="text-white font-semibold">{label}</span>
        </RainbowButton>
        {!canCall && !assistantsLoading && (
          <div className="mt-3 text-sm text-red-400">
            {resolveError || "Assistant not found for this URL."}
          </div>
        )}
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
      <div className="flex items-center flex-col justify-center px-2 md:px-8 py-8 w-full h-screen relative z-10">
        <div className="relative bg-gray-900 bg-opacity-60 p-4 rounded-xl border border-gray-700 shadow-2xl backdrop-blur-sm max-w-lg w-full">
          <GlowingEffect
            spread={40}
            glow={true}
            disabled={false}
            proximity={64}
            inactiveZone={0.01}
            borderWidth={3}
          />
          <div className="mb-6 text-center">
            <h2 className="text-2xl tracking-tight text-white mb-2">
              {resolvedAssistantName || (selected === "kira" ? "kira™" : selected)}
            </h2>
            <p className="text-blue-300 text-sm">Experience the future of AI conversations</p>
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
