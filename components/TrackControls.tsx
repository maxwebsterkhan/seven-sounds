import React from "react";
import { SOUNDS } from "../constants/sounds";

interface TrackControlsProps {
  mutedTracks: { [key: number]: boolean };
  volumeLevels: { [key: number]: number };
  onToggleMute: (trackId: number) => void;
  onVolumeChange: (trackId: number, volume: number) => void;
}

export const TrackControls: React.FC<TrackControlsProps> = ({
  mutedTracks,
  volumeLevels,
  onToggleMute,
  onVolumeChange,
}) => {
  return (
    <div className="relative z-10 grid grid-cols-1 gap-4">
      {SOUNDS.map((sound) => (
        <div
          key={sound.id}
          className="p-4 rounded-lg bg-gray-800 bg-opacity-80 backdrop-blur-sm border border-gray-700"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium" style={{ color: sound.color }}>
              {sound.name}
            </span>
            <button
              onClick={() => onToggleMute(sound.id)}
              className={`px-3 py-1 rounded-lg transition text-sm ${
                mutedTracks[sound.id]
                  ? "bg-gray-600 hover:bg-gray-500"
                  : sound.color === "#FFEB3B"
                  ? "bg-yellow-500 hover:bg-yellow-600 text-black"
                  : `text-white`
              }`}
              style={{
                backgroundColor: mutedTracks[sound.id]
                  ? undefined
                  : sound.color,
                opacity: mutedTracks[sound.id] ? 0.7 : 1,
              }}
            >
              {mutedTracks[sound.id] ? "Unmute" : "Mute"}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: sound.color }}>
              0%
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volumeLevels[sound.id] || 0.8}
              onChange={(e) =>
                onVolumeChange(sound.id, parseFloat(e.target.value))
              }
              disabled={mutedTracks[sound.id]}
              className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${
                mutedTracks[sound.id] ? "opacity-50" : "opacity-100"
              }`}
              style={{
                background: `linear-gradient(to right, ${sound.color} 0%, ${
                  sound.color
                } ${(volumeLevels[sound.id] || 0.8) * 100}%, #374151 ${
                  (volumeLevels[sound.id] || 0.8) * 100
                }%, #374151 100%)`,
              }}
            />
            <span className="text-xs" style={{ color: sound.color }}>
              100%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
