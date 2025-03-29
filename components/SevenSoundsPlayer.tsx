"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

// Define types for our sound data
interface Sound {
  id: number;
  name: string;
  file: string;
  color: string;
  letter: string;
}

// Sample sound data - replace with your actual sound files
const SOUNDS: Sound[] = [
  {
    id: 1,
    name: "Triangle",
    file: "/sounds/triangle-loop.mp3",
    color: "#FF5252",
    letter: "S",
  }, // Red
  {
    id: 2,
    name: "Drums",
    file: "/sounds/drum-kick-loop.mp3",
    color: "#FF9800",
    letter: "E",
  }, // Orange
  {
    id: 3,
    name: "Piano",
    file: "/sounds/piano-loop.mp3",
    color: "#FFEB3B",
    letter: "V",
  }, // Yellow
  {
    id: 4,
    name: "Synth",
    file: "/sounds/synth-loop.mp3",
    color: "#4CAF50",
    letter: "E",
  }, // Green
  {
    id: 5,
    name: "Guitar",
    file: "/sounds/guitar-loop.mp3",
    color: "#2196F3",
    letter: "N",
  }, // Blue
  {
    id: 6,
    name: "Vocals",
    file: "/sounds/vocals-loop.mp3",
    color: "#673AB7",
    letter: "S",
  }, // Purple
  {
    id: 7,
    name: "Effects",
    file: "/sounds/effects-loop.mp3",
    color: "#E91E63",
    letter: "O",
  }, // Pink
];

// Define types for our ref objects
interface AudioBuffers {
  [key: number]: AudioBuffer;
}

interface SourceNodes {
  [key: number]: AudioBufferSourceNode;
}

interface GainNodes {
  [key: number]: GainNode;
}

interface MutedTracks {
  [key: number]: boolean;
}

interface VolumeLevels {
  [key: number]: number;
}

interface AnalyserNodes {
  [key: number]: AnalyserNode;
}

interface AudioData {
  [key: number]: Uint8Array;
}

// Added to store the time domain data as well
interface TimeData {
  [key: number]: Uint8Array;
}

// Added to make the visualization state update independently from React
interface VisualizationData {
  [key: number]: {
    waves: Array<{
      height: number;
      opacity: number;
    }>;
  };
}

const SevenSoundsPlayer = () => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [mutedTracks, setMutedTracks] = useState<MutedTracks>({});
  const [volumeLevels, setVolumeLevels] = useState<VolumeLevels>({});
  const [loadingProgress, setLoadingProgress] = useState<number>(0);

  // Added state to force render updates for visualization
  const [, setVisualizationTrigger] = useState<number>(0);

  // Refs to store audio-related objects
  const audioContext = useRef<AudioContext | null>(null);
  const audioBuffers = useRef<AudioBuffers>({});
  const sourceNodes = useRef<SourceNodes>({});
  const gainNodes = useRef<GainNodes>({});
  const analyserNodes = useRef<AnalyserNodes>({});
  const audioData = useRef<AudioData>({});
  const timeData = useRef<TimeData>({}); // Added for time domain data
  const visualizationData = useRef<VisualizationData>({});
  const animationRef = useRef<number | null>(null);
  const startTime = useRef<number>(0);
  const pauseTime = useRef<number>(0);
  const frameCount = useRef<number>(0);

  // Initialize visualization data
  useEffect(() => {
    SOUNDS.forEach((sound) => {
      visualizationData.current[sound.id] = {
        waves: Array(8)
          .fill(0)
          .map(() => ({
            height: 0,
            opacity: 0.3,
          })),
      };
    });
  }, []);

  // Animation loop to update visualizations - completely rewritten
  const updateVisualization = useCallback(() => {
    if (!isPlaying || typeof window === "undefined") return;

    // Increment frame counter
    frameCount.current += 1;

    // Update the visualization on every frame
    let shouldUpdateState = false;

    // Update audio data for each track
    SOUNDS.forEach((sound) => {
      const analyser = analyserNodes.current[sound.id];
      const dataArray = audioData.current[sound.id];
      const timeDomainArray = timeData.current[sound.id];

      if (analyser && dataArray && timeDomainArray) {
        // Get frequency data
        analyser.getByteFrequencyData(dataArray);

        // Get time domain data - this gives a different visualization
        analyser.getByteTimeDomainData(timeDomainArray);

        // For visualization, we'll use both time and frequency data
        // to ensure we always get visual movement

        // Sample a few points for the waves
        const numWaves = 8;
        const step = Math.floor(dataArray.length / numWaves);

        for (let i = 0; i < numWaves; i++) {
          const freqIndex = i * step;
          const timeIndex = i * 4 + (frameCount.current % 4); // Add variation based on frames

          // Get both frequency and time data for more active visualization
          const freqValue = dataArray[freqIndex] || 0;
          const timeValue = timeDomainArray[timeIndex] || 128;

          // Normalize values - frequency data is 0-255, time data is centered around 128
          const normalizedFreq = freqValue / 255;
          const normalizedTime = Math.abs((timeValue - 128) / 128);

          // Combine both values for a more active visualization
          // Emphasize the frequency data but add time data for constant movement
          let combinedValue = normalizedFreq * 0.8 + normalizedTime * 0.8;

          // Ensure some minimum movement with a bias
          combinedValue = Math.max(0.05, combinedValue);

          // Apply some smoothing with previous values
          const currentHeight =
            visualizationData.current[sound.id].waves[i].height;
          const newHeight = currentHeight * 0.7 + combinedValue * 0.3;

          // Store the new values
          visualizationData.current[sound.id].waves[i].height = newHeight;
          visualizationData.current[sound.id].waves[i].opacity =
            0.3 + newHeight * 0.7;
        }

        // We'll trigger a state update every 6 frames to keep the UI responsive
        // but not too intensive on performance
        if (frameCount.current % 6 === 0) {
          shouldUpdateState = true;
        }
      }
    });

    // Force a re-render to update visualization
    if (shouldUpdateState) {
      setVisualizationTrigger((prev) => prev + 1);
    }

    // Request next frame
    animationRef.current = requestAnimationFrame(updateVisualization);
  }, [isPlaying]);

  // Start visualization when playing, stop when paused
  useEffect(() => {
    // Safety check for browser environment
    if (typeof window === "undefined") return;

    if (isPlaying) {
      // Start animation loop
      animationRef.current = requestAnimationFrame(updateVisualization);
    } else if (animationRef.current) {
      // Stop animation loop
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    return () => {
      // Clean up animation on component unmount
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying, updateVisualization]);

  // Initialize Web Audio API context
  useEffect(() => {
    // Safety check to ensure we're in the browser
    if (typeof window === "undefined") return;

    // Create audio context on client-side only
    try {
      // Use AudioContext with fallback for older browsers
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      audioContext.current = new AudioCtx();
    } catch (error) {
      console.error("Failed to create AudioContext:", error);
      return;
    }

    // Load all sound files
    const loadSounds = async (): Promise<void> => {
      try {
        // Only proceed if we're in a browser environment
        if (typeof window === "undefined" || !audioContext.current) {
          console.error(
            "Audio context not available or not in browser environment"
          );
          return;
        }

        const totalSounds = SOUNDS.length;
        let loadedCount = 0;

        await Promise.all(
          SOUNDS.map(async (sound) => {
            try {
              const response = await fetch(sound.file);

              if (!response.ok) {
                throw new Error(
                  `Failed to fetch sound file: ${sound.file} (${response.status})`
                );
              }

              const arrayBuffer = await response.arrayBuffer();

              if (audioContext.current) {
                const audioBuffer = await audioContext.current.decodeAudioData(
                  arrayBuffer
                );

                audioBuffers.current[sound.id] = audioBuffer;
                loadedCount++;
                setLoadingProgress(
                  Math.floor((loadedCount / totalSounds) * 100)
                );

                console.log(`Loaded sound: ${sound.name}`);
              }
            } catch (error) {
              console.error(`Error loading sound: ${sound.name}`, error);
              // Continue with other sounds even if one fails
              loadedCount++;
              setLoadingProgress(Math.floor((loadedCount / totalSounds) * 100));
            }
          })
        );

        // Initialize gain nodes and analyzers for each track
        if (audioContext.current) {
          SOUNDS.forEach((sound) => {
            if (audioContext.current && audioBuffers.current[sound.id]) {
              // Create gain node for volume control
              const gainNode = audioContext.current.createGain();

              // Create analyser node with improved settings for visualization
              const analyserNode = audioContext.current.createAnalyser();

              // Use smaller FFT size for better performance and more responsive visualization
              analyserNode.fftSize = 128; // Smaller for faster processing
              analyserNode.minDecibels = -90; // Default
              analyserNode.maxDecibels = -10; // Default
              analyserNode.smoothingTimeConstant = 0.65; // Middle ground

              // Connect nodes: source -> gain -> analyser -> destination
              gainNode.connect(analyserNode);
              analyserNode.connect(audioContext.current.destination);

              // Store nodes in refs
              gainNodes.current[sound.id] = gainNode;
              analyserNodes.current[sound.id] = analyserNode;

              // Create data arrays for analyzers
              const bufferLength = analyserNode.frequencyBinCount;
              audioData.current[sound.id] = new Uint8Array(bufferLength);
              timeData.current[sound.id] = new Uint8Array(bufferLength);

              // Set default volume to 0.8 (80%)
              setVolumeLevels((prev) => ({
                ...prev,
                [sound.id]: 0.8,
              }));
              gainNode.gain.value = 0.8;

              console.log(`Set up audio nodes for: ${sound.name}`);
            }
          });
        }

        // Initialize visualization data
        SOUNDS.forEach((sound) => {
          visualizationData.current[sound.id] = {
            waves: Array(8)
              .fill(0)
              .map(() => ({
                height: 0,
                opacity: 0.3,
              })),
          };
        });

        setIsLoaded(true);
      } catch (error) {
        console.error("Error loading audio files:", error);
      }
    };

    loadSounds();

    // Cleanup function
    const cleanup = () => {
      if (audioContext.current && audioContext.current.state !== "closed") {
        // Stop all source nodes
        Object.values(sourceNodes.current).forEach((source) => {
          if (source) {
            try {
              source.stop();
            } catch {
              // Ignore errors if source already stopped
            }
          }
        });

        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }

        audioContext.current.close();
      }
    };

    return cleanup;
  }, []);

  // Play all tracks in sync
  const playAllTracks = (): void => {
    if (!isLoaded || !audioContext.current || typeof window === "undefined")
      return;

    try {
      // Some browsers (Safari) require user interaction to start audio context
      if (audioContext.current.state === "suspended") {
        audioContext.current.resume();
      }

      const currentTime = audioContext.current.currentTime;

      // Calculate the offset if we're resuming after pause
      const offset = isPlaying ? 0 : pauseTime.current;

      // Stop any currently playing sources
      stopAllTracks(false);

      // Reset visualization data
      SOUNDS.forEach((sound) => {
        visualizationData.current[sound.id].waves.forEach((wave) => {
          wave.height = 0;
          wave.opacity = 0.3;
        });
      });

      // Create and connect new source nodes for each track
      SOUNDS.forEach((sound) => {
        if (audioContext.current && audioBuffers.current[sound.id]) {
          const source = audioContext.current.createBufferSource();
          source.buffer = audioBuffers.current[sound.id];

          // Set looping to true for continuous playback
          source.loop = true;

          // Connect to the gain node
          source.connect(gainNodes.current[sound.id]);

          // Start playback - offset for pausing/resuming
          source.start(0, offset % source.buffer.duration);

          // Store the source node
          sourceNodes.current[sound.id] = source;

          console.log(`Started playing: ${sound.name}`);
        } else {
          console.warn(`Could not play sound: ${sound.name}`);
        }
      });

      // If we're starting from the beginning, reset the start time
      if (!isPlaying) {
        startTime.current = currentTime - offset;
      }

      setIsPlaying(true);
    } catch (error) {
      console.error("Error playing audio:", error);
    }
  };

  // Stop all tracks
  const stopAllTracks = (updateState: boolean = true): void => {
    // Calculate current playback position for pause functionality
    if (isPlaying && audioContext.current) {
      pauseTime.current = audioContext.current.currentTime - startTime.current;
    }

    // Stop all source nodes
    Object.values(sourceNodes.current).forEach((source) => {
      if (source) {
        try {
          source.stop();
        } catch {
          // Ignore errors if source was already stopped
        }
      }
    });

    // Clear source nodes
    sourceNodes.current = {};

    if (updateState) {
      setIsPlaying(false);
    }
  };

  // Reset and start from beginning
  const resetTracks = (): void => {
    pauseTime.current = 0;
    stopAllTracks();
    setIsPlaying(false);
  };

  // Toggle play/pause
  const togglePlayback = (): void => {
    if (isPlaying) {
      stopAllTracks();
    } else {
      playAllTracks();
    }
  };

  // Toggle mute for a specific track
  const toggleMute = (trackId: number): void => {
    const isMuted = mutedTracks[trackId];

    // Update gain node
    const gainNode = gainNodes.current[trackId];
    if (gainNode) {
      // When unmuting, restore to the previous volume level
      gainNode.gain.value = isMuted ? volumeLevels[trackId] || 0.8 : 0;
    }

    // Update state
    setMutedTracks((prev) => ({
      ...prev,
      [trackId]: !isMuted,
    }));
  };

  // Handle volume change for a specific track
  const handleVolumeChange = (trackId: number, volume: number): void => {
    // Update gain node if track is not muted
    const gainNode = gainNodes.current[trackId];
    if (gainNode && !mutedTracks[trackId]) {
      gainNode.gain.value = volume;
    }

    // Always update the volume level state
    setVolumeLevels((prev) => ({
      ...prev,
      [trackId]: volume,
    }));
  };

  // If not loaded yet, show loading progress
  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center h-64 p-8">
        <h2 className="text-xl mb-4">Loading Sounds: {loadingProgress}%</h2>
        <div className="w-full h-4 bg-gray-200 rounded-full">
          <div
            className="h-full bg-blue-500 rounded-full"
            style={{ width: `${loadingProgress}%` }}
          ></div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col p-8 pt-12 bg-gray-900 text-white rounded-lg max-w-3xl mx-auto overflow-hidden">
      {/* Background columns */}
      <div className="absolute inset-0 grid grid-cols-7 z-0">
        {SOUNDS.map((sound) => {
          // Get visualization data for this sound
          const wavesData = visualizationData.current[sound.id]?.waves || [];

          // Create wave effect based on audio data
          const waveElements = wavesData.map((wave, i) => (
            <div
              key={i}
              className="absolute bottom-0 left-0 right-0 bg-white transition-all"
              style={{
                height: `${wave.height * 100}%`,
                transform: `translateY(${(1 - wave.height) * 100}%)`,
                opacity: wave.opacity,
                transitionDuration: "100ms",
                // Add subtle horizontal positioning for variation
                left: `${(i / 8) * 100}%`,
                right: `${(1 - (i + 1) / 8) * 100}%`,
              }}
            />
          ));

          // Add a subtle shadow glow in the track's color
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
              {/* Render the wave elements */}
              {waveElements}

              {/* Add a bottom glow when active */}
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

      <h2 className="relative z-10 text-3xl font-bold mb-6 text-center">
        SEVEN SOUNDS
      </h2>

      <div className="relative z-10 flex justify-center space-x-4 mb-8">
        <button
          onClick={togglePlayback}
          className="px-6 py-3 bg-gray-800 bg-opacity-80 text-white rounded-lg hover:bg-gray-700 transition border border-gray-600"
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button
          onClick={resetTracks}
          className="px-6 py-3 bg-gray-800 bg-opacity-80 text-white rounded-lg hover:bg-gray-700 transition border border-gray-600"
        >
          Reset
        </button>
      </div>

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
                onClick={() => toggleMute(sound.id)}
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
                  handleVolumeChange(sound.id, parseFloat(e.target.value))
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

      <p className="relative z-10 mt-6 text-center text-gray-400 text-sm">
        All tracks are synchronized and will play together. Use the mute buttons
        to create your own mix.
      </p>

      <div className="relative z-10 mt-8 grid grid-cols-7 gap-1">
        {SOUNDS.map((sound) => (
          <div key={sound.id} className="flex flex-col items-center">
            <div
              className="w-4 h-4 rounded-full mb-1"
              style={{ backgroundColor: sound.color }}
            ></div>
            <span
              className="text-xs text-center"
              style={{ color: sound.color }}
            >
              {sound.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SevenSoundsPlayer;
