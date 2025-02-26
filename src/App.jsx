import { useEffect, useState, useCallback } from "react";
import ActiveCallDetail from "./components/ActiveCallDetail";
import { Button } from "./components/ui/MovingBorder";
import Vapi from "@vapi-ai/web";

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

  // Call handlers
  const startCall = useCallback(() => {
    const assistantId = assistants[selected];
    if (assistantId) {
      setCallState(prev => ({ ...prev, connecting: true }));
      vapi.start(assistantId);

      if (selected === "kira") {
        setTimeout(() => {
          setCallState({ connecting: false, connected: true });
        }, 2500);
      }
    } else {
      console.warn(`Assistant ID not found for "${selected}"`);
    }
  }, [assistants, selected]);

  const endCall = useCallback(() => {
    vapi.stop();
  }, []);

  // Render helper functions for cleaner JSX
  const renderCallButton = () => {
    if (callState.connected) {
      return <Button onClick={endCall} color="#FFFFFF">End Call</Button>;
    }
    
    if (callState.connecting) {
      return <Button>Connecting...</Button>;
    }
    
    const label = selected === "kira" ? "kira™" : selected.toUpperCase();
    return (
      <Button onClick={startCall}>
        <span style={{color: "#FFFFFF"}}>
          Listen to <span style={{color: "#37CFFF"}}>{label}</span> in Action
        </span>
      </Button>
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
      <div className="flex items-center flex-col justify-center px-2 md:px-10 py-4 w-full h-screen">
        <div className="text-white font-bold text-center">
          {renderCallInterface()}
        </div>  
      </div>
    </div>   
  );
};

export default App;
