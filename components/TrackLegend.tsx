import React from "react";
import { SOUNDS } from "../constants/sounds";

export const TrackLegend: React.FC = () => {
  return (
    <div className="relative z-10 mt-8 grid grid-cols-7 gap-1">
      {SOUNDS.map((sound) => (
        <div key={sound.id} className="flex flex-col items-center">
          <div
            className="w-4 h-4 rounded-full mb-1"
            style={{ backgroundColor: sound.color }}
          ></div>
          <span className="text-xs text-center" style={{ color: sound.color }}>
            {sound.name}
          </span>
        </div>
      ))}
    </div>
  );
};
