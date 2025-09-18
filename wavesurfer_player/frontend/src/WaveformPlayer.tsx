import {
  Streamlit,
  StreamlitComponentBase,
  withStreamlitConnection,
} from "streamlit-component-lib"
import React, { useEffect, useRef, useState } from "react"
import WaveSurfer from "wavesurfer.js"

const formatTime = (seconds: number): string => {
  if (isNaN(seconds)) return "0:00";
  const date = new Date(seconds * 1000)
  const hh = date.getUTCHours()
  const mm = date.getUTCMinutes()
  const ss = date.getUTCSeconds().toString().padStart(2, "0")
  if (hh) {
    return `${hh}:${mm.toString().padStart(2, "0")}:${ss}`
  }
  return `${mm}:${ss}`
}

const WaveformPlayer = (props: any) => {
  const waveformRef = useRef<HTMLDivElement>(null)
  const wavesurfer = useRef<WaveSurfer | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [volume, setVolume] = useState(1); // Default volume: 100%
  const [stickyLoop, setStickyLoop] = useState(false);
  const stickyLoopRef = useRef(stickyLoop);

  const { audio_b64, height } = props.args

  useEffect(() => {
    if (!waveformRef.current) return;

    wavesurfer.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: "#6c757d",
      progressColor: "#ff9900",
      height: height,
      barWidth: 2,
      barGap: 1,
      cursorWidth: 2,
      cursorColor: "#fff",
      backend: 'MediaElement',
      dragToSeek: true,
    });

    wavesurfer.current.on("ready", () => {
      if (wavesurfer.current) {
        setTotalDuration(wavesurfer.current.getDuration());
        // Apply sticky loop to the underlying media element if requested
        try {
          const media = (wavesurfer.current as any).media as HTMLMediaElement | undefined
          if (media) {
            media.loop = stickyLoopRef.current
          }
        } catch (e) {
          // ignore if backend doesn't expose media directly
        }
      }
    });

    wavesurfer.current.on("timeupdate", (time) => {
      setCurrentTime(time);
    });

    wavesurfer.current.on("seeking", (time) => {
      setCurrentTime(time);
      Streamlit.setComponentValue(time);
    });

    wavesurfer.current.on("pause", () => {
      if (wavesurfer.current) {
        const time = wavesurfer.current.getCurrentTime();
        setCurrentTime(time);
        Streamlit.setComponentValue(time);
      }
      setIsPlaying(false);
    });

    wavesurfer.current.on("play", () => setIsPlaying(true));

    return () => {
      if (wavesurfer.current) {
        wavesurfer.current.destroy();
      }
    };
  }, [height]);

  // keep the ref in sync so the ready handler can read the latest value
  useEffect(() => {
    stickyLoopRef.current = stickyLoop
  }, [stickyLoop]);

  // Memoize finishHandler to avoid unnecessary re-registrations
  const finishHandler = React.useCallback(() => {
    if (stickyLoop && wavesurfer.current) {
      try {
        (wavesurfer.current as any).seekTo(0)
        (wavesurfer.current as any).play()
      } catch (e) {
        // ignore
      }
    }
  }, [stickyLoop]);

  // Keep loop state synced to the media element when stickyLoop changes
  // Extracted loop setup logic for readability and testability
  const setupLoopState = () => {
    if (!wavesurfer.current) return;
    try {
      const media = (wavesurfer.current as any).media as HTMLMediaElement | undefined;
      if (media) {
        media.loop = stickyLoop;
      } else {
        // fallback: if no direct media element, try to use wavesurfer's backend methods
        // For backends that don't expose a media element, add/remove a 'finish' handler
        const ws: any = wavesurfer.current;

        // remove previous listener first to avoid duplicates
        try {
          ws.un('finish', finishHandler);
        } catch (e) {
          // ignore if un() not supported
        }

        if (stickyLoop) {
          try {
            ws.on('finish', finishHandler);
          } catch (e) {
            // ignore
          }
        }
      }
    } catch (e) {
      // ignore errors setting loop
    }
  };

  // Keep loop state synced to the media element when stickyLoop changes
  useEffect(() => {
    setupLoopState();
  }, [stickyLoop, finishHandler]);

  useEffect(() => {
    if (wavesurfer.current && audio_b64) {
      try {
        const audioBlob = new Blob([Uint8Array.from(atob(audio_b64), c => c.charCodeAt(0))]);
        wavesurfer.current.loadBlob(audioBlob);
      } catch (e) {
        console.error("Error decoding or loading audio data:", e);
      }
    }
  }, [audio_b64]);

  useEffect(() => {
    if (wavesurfer.current) {
      wavesurfer.current.setVolume(volume);
    }
  }, [volume]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!wavesurfer.current) return;
      if (e.key === "ArrowRight") {
        const newTime = Math.min(wavesurfer.current.getCurrentTime() + 1, wavesurfer.current.getDuration());
        wavesurfer.current.seekTo(newTime / wavesurfer.current.getDuration());
      } else if (e.key === "ArrowLeft") {
        const newTime = Math.max(wavesurfer.current.getCurrentTime() - 1, 0);
        wavesurfer.current.seekTo(newTime / wavesurfer.current.getDuration());
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handlePlayPause = () => {
    if (wavesurfer.current) {
      wavesurfer.current.playPause()
    }
  }

  const handleSpeedChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newRate = parseFloat(event.target.value)
    setPlaybackRate(newRate)
    if (wavesurfer.current) {
      wavesurfer.current.setPlaybackRate(newRate)
    }
  }

  const { show_controls } = props.args

  return (
    <div style={{ background: "#212529", padding: "20px", borderRadius: "8px", color: "white" }}>
      <div ref={waveformRef} />
      {show_controls && (
        <div style={{
          marginTop: "15px",
          display: "flex",
          alignItems: "center",
          gap: "20px"
        }}>
          <button onClick={handlePlayPause} style={{
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "5px",
            padding: "10px 20px",
            fontSize: "16px",
            cursor: "pointer"
          }}>
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button
            onClick={() => setStickyLoop(s => !s)}
            title="Sticky loop (toggle)"
            style={{
              background: stickyLoop ? "#28a745" : "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "5px",
              padding: "8px 12px",
              fontSize: "14px",
              cursor: "pointer"
            }}
          >
            {stickyLoop ? "Loop: On" : "Loop: Off"}
          </button>
          <label htmlFor="speed-select" style={{ whiteSpace: "nowrap" }}>
            <select id="speed-select" value={playbackRate} onChange={handleSpeedChange} style={{
              background: "#444",
              color: "white",
              border: "1px solid #666",
              borderRadius: "5px",
              padding: "5px",
              marginLeft: "5px"
            }}>
              <option value="0.5">0.5x</option>
              <option value="1">1x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>
          </label>
          <label htmlFor="volume-slider" style={{ whiteSpace: "nowrap" }}>
            Volume:
            <input
              id="volume-slider"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={e => setVolume(Number(e.target.value))}
              style={{ width: '100px', marginLeft: "5px", verticalAlign: "middle" }}
            />
          </label>
          <div style={{ fontFamily: "monospace", marginLeft: "auto", whiteSpace: "nowrap" }}>
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </div>
        </div>
      )}
    </div>
  )
}

class WaveformComponent extends StreamlitComponentBase {
  public render = (): React.ReactNode => {
    return <WaveformPlayer args={this.props.args} />
  }
}

export default withStreamlitConnection(WaveformComponent)