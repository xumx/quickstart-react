import React from 'react';
import { FlickeringGrid } from './ui/flickering-grid';

const FlickeringBackground = () => {
  return (
    <div className="fixed top-0 left-0 w-full h-full -z-10">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0f1623] to-[#1a1b26]"></div>
      <FlickeringGrid
        className="z-0 absolute inset-0 size-full"
        squareSize={4}
        gridGap={6}
        color="#4c7894" // Blue color that matches the theme
        maxOpacity={0.2}
        flickerChance={0.1}
      />
    </div>
  );
};

export default FlickeringBackground;
