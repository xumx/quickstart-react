import { useEffect, useState } from "react";

import ActiveCallDetail from "./components/ActiveCallDetail";
// import Button from "./components/base/Button";
import { Button } from "./components/ui/MovingBorder"
import { Vortex } from "./components/ui/Vortex";
import Vapi from "@vapi-ai/web";

// Put your Vapi Public Key below.
const vapi = new Vapi("ed768954-311b-4532-920d-ff3a635c3e8f");

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
  const startCallInline = (assistantId) => {
    setConnecting(true);
    vapi.start(assistantId);
  };
  const endCall = () => {
    vapi.stop();
  };

  // startCallInline("51b6b26e-b9eb-4bf2-adfc-21181018caea")
  // isLoading={connecting}
  const assistants = {
    "Clinic":"4ce4d519-6c69-486e-868a-81ee628f199f",
    "After Hours Hotline": "520bd53a-233f-4d55-b574-3caab7e967b7"
  }

  return (
    <div className="mx-auto h-screen overflow-hidden">
    <Vortex
      rangeY={800}
      baseHue={120}
      backgroundColor="black"
      className="flex items-center flex-col justify-center px-2 md:px-10 py-4 w-full h-screen"
    >
    <div className="flex items-center flex-col justify-center px-2 md:px-10 py-4 w-full h-screen">
      <div className="text-white font-bold text-center">
        {connected ? (
          <ActiveCallDetail
            assistantIsSpeaking={assistantIsSpeaking}
            volumeLevel={volumeLevel}
            onEndCallClick={endCall}
          />
        ): (
          !connecting ? (<><Button onClick={() => startCallInline(assistants["Clinic"])}>
          Call Clinic
        </Button><br/><br/>
        <Button onClick={() => startCallInline(assistants["After Hours Hotline"])}>
        Call 13Sick Hotline
      </Button>
          </>) : (<Button>Connecting...</Button>)
        )
        }
      </div>  
    </div>
    </Vortex>
  </div>   

  );
};

export default App;
