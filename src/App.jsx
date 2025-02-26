import { useEffect, useState } from "react";
import ActiveCallDetail from "./components/ActiveCallDetail";
import { Button } from "./components/ui/MovingBorder"
import Vapi from "@vapi-ai/web";

// Put your Vapi Public Key below.
const vapi = new Vapi("ed768954-311b-4532-920d-ff3a635c3e8f");

const assistants = {
  "kira": "438a05de-9605-437d-9dbd-4282074730dc"
}

fetch("https://omni.keyreply.com/v1/api/voiceAssistants").then(res=>res.json()).then(list=> {
  list.forEach(assistant => assistants[assistant.name.toLowerCase()] = assistant.id)

  console.log("Finish Loading other assistants");
  console.log(assistants);
});

const selected = decodeURIComponent((window.location.pathname.replace("/","") || "KR Hospital").toLowerCase());
console.log(selected)

const App = () => {
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);

  const [assistantIsSpeaking, setAssistantIsSpeaking] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);

  // hook into Vapi events
  useEffect(() => {
    vapi.on("call-start", () => {
      setConnecting(false);
      setConnected(true);
    });

    vapi.on("call-end", () => {
      setConnecting(false);
      setConnected(false);
    });

    vapi.on("speech-start", () => {
      setAssistantIsSpeaking(true);
    });

    vapi.on("speech-end", () => {
      setAssistantIsSpeaking(false);
    });

    vapi.on("volume-level", (level) => {
      setVolumeLevel(level);
    });

    vapi.on("error", (error) => {
      console.error(error);

      setConnecting(false);
      alert("Error connecting to server, Please check your network connection");
    });

    // we only want this to fire on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // call start handler
  const startCallInline = () => {
    const assistantId = assistants[selected];
    if (assistantId) {
      setConnecting(true);
      vapi.start(assistantId);
    } else {
      console.warn("Assistant ID not found")
    }
  };
  const endCall = () => {
    vapi.stop();
  };

  return (
    <div className="mx-auto h-screen overflow-hidden">
    <div className="flex items-center flex-col justify-center px-2 md:px-10 py-4 w-full h-screen">
      <div className="text-white font-bold text-center">
        {connected ? (
          (selected?.toUpperCase() == "KIRA") ? (
            <Button onClick={endCall} color="#FFFFFF">End Call</Button>
          ) : (
            <ActiveCallDetail
              assistantIsSpeaking={assistantIsSpeaking}
              volumeLevel={volumeLevel}
              onEndCallClick={endCall}
            />
          )
        ): (
          !connecting ? (
          <Button onClick={() => startCallInline()}>
          <span style={{color: "#FFFFFF"}}>Listen to <span style={{color: "#37CFFF"}}>{selected.toUpperCase()}</span> in Action</span>
          </Button>
          ) : (<Button>Connecting...</Button>)
        )
        }
      </div>  
    </div>
  </div>   
  );
};

export default App;
