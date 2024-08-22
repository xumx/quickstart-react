import { useEffect, useState } from "react";

import ActiveCallDetail from "./components/ActiveCallDetail";
// import Button from "./components/base/Button";
import { Button } from "./components/ui/MovingBorder"
import Vapi from "@vapi-ai/web";

// Put your Vapi Public Key below.
const vapi = new Vapi("ed768954-311b-4532-920d-ff3a635c3e8f");

const selected = (window.location.pathname.replace("/","") || "KR Hospital").toLowerCase();
console.log(selected)

const assistants = {
  "kr hospital": "c3bbb50f-ee6e-4e72-9d08-584a71cd4562",
  "epica":"c3bbb50f-ee6e-4e72-9d08-584a71cd4562",
  "13sick": "520bd53a-233f-4d55-b574-3caab7e967b7",
  "olinqua": "ee4b70e7-f13a-4361-a659-a0a53fa64369",
  "myhealth": "b39a60ae-d4bb-4862-9c43-67625036eb1d",
  "posmalay": "9fba33d2-f3aa-47b4-9f12-9f4fdd39a0ff",
  "sjmc": "c244e7ca-38d9-4f48-9e42-a72e5a69f68c",
  "prudential": "1767f49b-5b6c-4488-a42f-42a25b8153e0",
  "aia": "c4aae5da-fa55-4aab-b143-2d941a8e49ae",
  "outbound": "921a6b10-491b-4789-b5a4-5f936e284504",
  "preop":"a4afc764-7589-437f-969d-90e9b99c104e"
}

fetch("https://omni.keyreply.com/v1/api/voiceAssistants").then(res=>res.json()).then(list=> {
  list.forEach(assistant => assistants[assistant.name.toLowercase()] = assistant.id)

  console.log("Finish Loading other assistants");
  console.log(assistants);
});

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
  let assistants = {
    "kr hospital": "c3bbb50f-ee6e-4e72-9d08-584a71cd4562",
    "epica":"c3bbb50f-ee6e-4e72-9d08-584a71cd4562",
    "13sick": "520bd53a-233f-4d55-b574-3caab7e967b7",
    "olinqua": "ee4b70e7-f13a-4361-a659-a0a53fa64369",
    "myhealth": "b39a60ae-d4bb-4862-9c43-67625036eb1d",
    "posmalay": "9fba33d2-f3aa-47b4-9f12-9f4fdd39a0ff",
    "sjmc": "c244e7ca-38d9-4f48-9e42-a72e5a69f68c",
    "prudential": "1767f49b-5b6c-4488-a42f-42a25b8153e0",
    "aia": "c4aae5da-fa55-4aab-b143-2d941a8e49ae",
    "outbound": "921a6b10-491b-4789-b5a4-5f936e284504",
    "preop":"a4afc764-7589-437f-969d-90e9b99c104e"
  }



  return (
    <div className="mx-auto h-screen overflow-hidden">
    <div className="flex items-center flex-col justify-center px-2 md:px-10 py-4 w-full h-screen">
      <div className="text-white font-bold text-center">
        {connected ? (
          <ActiveCallDetail
            assistantIsSpeaking={assistantIsSpeaking}
            volumeLevel={volumeLevel}
            onEndCallClick={endCall}
          />
        ): (
          !connecting ? (
          <Button onClick={() => startCallInline(assistants[selected])}>
          Call {selected.toUpperCase()}
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
