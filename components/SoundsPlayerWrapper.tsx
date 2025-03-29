"use client";

import React from "react";
import dynamic from "next/dynamic";

const SevenSoundsPlayer = dynamic(
  () => import("@/components/SevenSoundsPlayer"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64 p-8 bg-gray-800 text-white rounded-lg">
        Loading audio player...
      </div>
    ),
  }
);

export default function SoundPlayerWrapper() {
  return <SevenSoundsPlayer />;
}
