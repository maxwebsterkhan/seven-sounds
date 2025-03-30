export interface Sound {
  id: number;
  name: string;
  file: string;
  color: string;
  letter: string;
}

export interface AudioBuffers {
  [key: number]: AudioBuffer;
}

export interface SourceNodes {
  [key: number]: AudioBufferSourceNode;
}

export interface GainNodes {
  [key: number]: GainNode;
}

export interface MutedTracks {
  [key: number]: boolean;
}

export interface VolumeLevels {
  [key: number]: number;
}

export interface AnalyserNodes {
  [key: number]: AnalyserNode;
}

export interface AudioData {
  [key: number]: Uint8Array;
}

export interface TimeData {
  [key: number]: Uint8Array;
}

export interface VisualizationData {
  [key: number]: {
    waves: Array<{
      height: number;
      opacity: number;
    }>;
  };
} 