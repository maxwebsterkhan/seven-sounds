import React from "react";
import { SOUNDS } from "../constants/sounds";
import { VisualizationData } from "../types/audio";

interface AudioVisualizationProps {
  visualizationData: VisualizationData;
  isPlaying: boolean;
  mutedTracks: { [key: number]: boolean };
  volumeLevels: { [key: number]: number };
}

export const AudioVisualization: React.FC<AudioVisualizationProps> = ({
  visualizationData,
  isPlaying,
  mutedTracks,
  volumeLevels,
}) => {
  return (
    <div className="absolute inset-0 grid grid-cols-7 z-0">
      {SOUNDS.map((sound) => {
        const wavesData = visualizationData[sound.id]?.waves || [];
        const waveElements = wavesData.map((wave, i) => (
          <div
            key={i}
            className="absolute bottom-0 left-0 right-0 bg-white transition-all"
            style={{
              height: `${wave.height * 100}%`,
              transform: `translateY(${(1 - wave.height) * 100}%)`,
              opacity: wave.opacity,
              transitionDuration: "100ms",
              left: `${(i / 8) * 100}%`,
              right: `${(1 - (i + 1) / 8) * 100}%`,
            }}
          />
        ));

        const glowStyle =
          isPlaying && !mutedTracks[sound.id]
            ? { boxShadow: `0 0 15px ${sound.color}`, zIndex: 1 }
            : {};

        return (
          <div
            key={sound.id}
            className="h-full relative overflow-hidden transition-all duration-300"
            style={{
              backgroundColor: sound.color,
              opacity: mutedTracks[sound.id]
                ? 0.05
                : (volumeLevels[sound.id] || 0.8) * 0.15,
              ...glowStyle,
            }}
          >
            {waveElements}
            {isPlaying && !mutedTracks[sound.id] && (
              <div
                className="absolute bottom-0 left-0 right-0 h-8 transition-opacity duration-500"
                style={{
                  background: `linear-gradient(to top, ${sound.color}88, transparent)`,
                  opacity:
                    wavesData.reduce((acc, wave) => acc + wave.height, 0) /
                    wavesData.length,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
