import AssistantSpeechIndicator from "./call/AssistantSpeechIndicator";
import { RainbowButton } from "./ui/rainbow-button";
import VolumeLevel from "./call/VolumeLevel";

const ActiveCallDetail = ({ assistantIsSpeaking, volumeLevel, onEndCallClick }) => {
  return (
    <div className="w-full">
      <div
        className="relative flex w-full max-w-md flex-col items-center justify-center rounded-xl bg-transparent p-4"
      >
        <AssistantSpeechIndicator isSpeaking={assistantIsSpeaking} />
        <VolumeLevel volume={volumeLevel} />
      </div>
      <div className="mt-5 text-center">
        <RainbowButton onClick={onEndCallClick} className="text-white">End Call</RainbowButton>
      </div>
    </div>
  );
};

export default ActiveCallDetail;
