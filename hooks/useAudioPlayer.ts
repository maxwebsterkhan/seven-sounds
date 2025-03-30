import { useState, useEffect, useRef, useCallback } from 'react';
import { SOUNDS } from '../constants/sounds';
import {
  AudioBuffers,
  SourceNodes,
  GainNodes,
  MutedTracks,
  VolumeLevels,
  AnalyserNodes,
  AudioData,
  TimeData,
  VisualizationData,
} from '../types/audio';

export const useAudioPlayer = () => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [mutedTracks, setMutedTracks] = useState<MutedTracks>({});
  const [volumeLevels, setVolumeLevels] = useState<VolumeLevels>({});
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [, setVisualizationTrigger] = useState<number>(0);

  const audioContext = useRef<AudioContext | null>(null);
  const audioBuffers = useRef<AudioBuffers>({});
  const sourceNodes = useRef<SourceNodes>({});
  const gainNodes = useRef<GainNodes>({});
  const analyserNodes = useRef<AnalyserNodes>({});
  const audioData = useRef<AudioData>({});
  const timeData = useRef<TimeData>({});
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

  // Animation loop to update visualizations
  const updateVisualization = useCallback(() => {
    if (!isPlaying || typeof window === "undefined") return;

    frameCount.current += 1;
    let shouldUpdateState = false;

    SOUNDS.forEach((sound) => {
      const analyser = analyserNodes.current[sound.id];
      const dataArray = audioData.current[sound.id];
      const timeDomainArray = timeData.current[sound.id];

      if (analyser && dataArray && timeDomainArray) {
        analyser.getByteFrequencyData(dataArray);
        analyser.getByteTimeDomainData(timeDomainArray);

        const numWaves = 8;
        const step = Math.floor(dataArray.length / numWaves);

        for (let i = 0; i < numWaves; i++) {
          const freqIndex = i * step;
          const timeIndex = i * 4 + (frameCount.current % 4);

          const freqValue = dataArray[freqIndex] || 0;
          const timeValue = timeDomainArray[timeIndex] || 128;

          const normalizedFreq = freqValue / 255;
          const normalizedTime = Math.abs((timeValue - 128) / 128);

          let combinedValue = normalizedFreq * 0.8 + normalizedTime * 0.8;
          combinedValue = Math.max(0.05, combinedValue);

          const currentHeight = visualizationData.current[sound.id].waves[i].height;
          const newHeight = currentHeight * 0.7 + combinedValue * 0.3;

          visualizationData.current[sound.id].waves[i].height = newHeight;
          visualizationData.current[sound.id].waves[i].opacity = 0.3 + newHeight * 0.7;
        }

        if (frameCount.current % 6 === 0) {
          shouldUpdateState = true;
        }
      }
    });

    if (shouldUpdateState) {
      setVisualizationTrigger((prev) => prev + 1);
    }

    animationRef.current = requestAnimationFrame(updateVisualization);
  }, [isPlaying]);

  // Start visualization when playing, stop when paused
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (isPlaying) {
      animationRef.current = requestAnimationFrame(updateVisualization);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying, updateVisualization]);

  // Initialize Web Audio API context
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContext.current = new AudioCtx();
    } catch (error) {
      console.error("Failed to create AudioContext:", error);
      return;
    }

    const loadSounds = async (): Promise<void> => {
      try {
        if (typeof window === "undefined" || !audioContext.current) {
          console.error("Audio context not available or not in browser environment");
          return;
        }

        const totalSounds = SOUNDS.length;
        let loadedCount = 0;

        await Promise.all(
          SOUNDS.map(async (sound) => {
            try {
              const response = await fetch(sound.file);
              if (!response.ok) {
                throw new Error(`Failed to fetch sound file: ${sound.file} (${response.status})`);
              }

              const arrayBuffer = await response.arrayBuffer();
              if (audioContext.current) {
                const audioBuffer = await audioContext.current.decodeAudioData(arrayBuffer);
                audioBuffers.current[sound.id] = audioBuffer;
                loadedCount++;
                setLoadingProgress(Math.floor((loadedCount / totalSounds) * 100));
                console.log(`Loaded sound: ${sound.name}`);
              }
            } catch (error) {
              console.error(`Error loading sound: ${sound.name}`, error);
              loadedCount++;
              setLoadingProgress(Math.floor((loadedCount / totalSounds) * 100));
            }
          })
        );

        if (audioContext.current) {
          SOUNDS.forEach((sound) => {
            if (audioContext.current && audioBuffers.current[sound.id]) {
              const gainNode = audioContext.current.createGain();
              const analyserNode = audioContext.current.createAnalyser();

              analyserNode.fftSize = 128;
              analyserNode.minDecibels = -90;
              analyserNode.maxDecibels = -10;
              analyserNode.smoothingTimeConstant = 0.65;

              gainNode.connect(analyserNode);
              analyserNode.connect(audioContext.current.destination);

              gainNodes.current[sound.id] = gainNode;
              analyserNodes.current[sound.id] = analyserNode;

              const bufferLength = analyserNode.frequencyBinCount;
              audioData.current[sound.id] = new Uint8Array(bufferLength);
              timeData.current[sound.id] = new Uint8Array(bufferLength);

              setVolumeLevels((prev) => ({
                ...prev,
                [sound.id]: 0.8,
              }));
              gainNode.gain.value = 0.8;

              console.log(`Set up audio nodes for: ${sound.name}`);
            }
          });
        }

        setIsLoaded(true);
      } catch (error) {
        console.error("Error loading audio files:", error);
      }
    };

    loadSounds();

    return () => {
      if (audioContext.current && audioContext.current.state !== "closed") {
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
  }, []);

  const playAllTracks = (): void => {
    if (!isLoaded || !audioContext.current || typeof window === "undefined") return;

    try {
      if (audioContext.current.state === "suspended") {
        audioContext.current.resume();
      }

      const currentTime = audioContext.current.currentTime;
      const offset = isPlaying ? 0 : pauseTime.current;

      stopAllTracks(false);

      SOUNDS.forEach((sound) => {
        visualizationData.current[sound.id].waves.forEach((wave) => {
          wave.height = 0;
          wave.opacity = 0.3;
        });
      });

      SOUNDS.forEach((sound) => {
        if (audioContext.current && audioBuffers.current[sound.id]) {
          const source = audioContext.current.createBufferSource();
          source.buffer = audioBuffers.current[sound.id];
          source.loop = true;
          source.connect(gainNodes.current[sound.id]);
          source.start(0, offset % source.buffer.duration);
          sourceNodes.current[sound.id] = source;
          console.log(`Started playing: ${sound.name}`);
        } else {
          console.warn(`Could not play sound: ${sound.name}`);
        }
      });

      if (!isPlaying) {
        startTime.current = currentTime - offset;
      }

      setIsPlaying(true);
    } catch (error) {
      console.error("Error playing audio:", error);
    }
  };

  const stopAllTracks = (updateState: boolean = true): void => {
    if (isPlaying && audioContext.current) {
      pauseTime.current = audioContext.current.currentTime - startTime.current;
    }

    Object.values(sourceNodes.current).forEach((source) => {
      if (source) {
        try {
          source.stop();
        } catch {
          // Ignore errors if source was already stopped
        }
      }
    });

    sourceNodes.current = {};

    if (updateState) {
      setIsPlaying(false);
    }
  };

  const resetTracks = (): void => {
    pauseTime.current = 0;
    stopAllTracks();
    setIsPlaying(false);
  };

  const togglePlayback = (): void => {
    if (isPlaying) {
      stopAllTracks();
    } else {
      playAllTracks();
    }
  };

  const toggleMute = (trackId: number): void => {
    const isMuted = mutedTracks[trackId];
    const gainNode = gainNodes.current[trackId];
    if (gainNode) {
      gainNode.gain.value = isMuted ? volumeLevels[trackId] || 0.8 : 0;
    }

    setMutedTracks((prev) => ({
      ...prev,
      [trackId]: !isMuted,
    }));
  };

  const handleVolumeChange = (trackId: number, volume: number): void => {
    const gainNode = gainNodes.current[trackId];
    if (gainNode && !mutedTracks[trackId]) {
      gainNode.gain.value = volume;
    }

    setVolumeLevels((prev) => ({
      ...prev,
      [trackId]: volume,
    }));
  };

  return {
    isPlaying,
    isLoaded,
    loadingProgress,
    mutedTracks,
    volumeLevels,
    visualizationData: visualizationData.current,
    togglePlayback,
    resetTracks,
    toggleMute,
    handleVolumeChange,
  };
}; 