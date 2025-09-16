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

  const { audio_b64, height } = props.args

  useEffect(() => {
    if (waveformRef.current) {
      if (wavesurfer.current) {
        wavesurfer.current.destroy()
      }

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
      })

      try {
        const audioBlob = new Blob([Uint8Array.from(atob(audio_b64), c => c.charCodeAt(0))]);
        wavesurfer.current.loadBlob(audioBlob)
      } catch (e) {
        console.error("Error decoding or loading audio data:", e)
        return;
      }

      wavesurfer.current.on("ready", () => {
        if (wavesurfer.current) {
          setTotalDuration(wavesurfer.current.getDuration())
        }
      })
      wavesurfer.current.on("timeupdate", (time) => {
        setCurrentTime(time)
      })
      wavesurfer.current.on("seeking", (time) => {
        setCurrentTime(time)
      });
      
      wavesurfer.current.on("play", () => setIsPlaying(true))
      wavesurfer.current.on("pause", () => setIsPlaying(false))

      return () => {
        if (wavesurfer.current) {
          wavesurfer.current.destroy()
        }
      }
    }
  }, [audio_b64, height])

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
        <div style={{ marginTop: "15px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={handlePlayPause} style={{
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "5px",
            padding: "10px 20px",
            fontSize: "16px",
            cursor: "pointer",
          }}>
            {isPlaying ? "Pause" : "Play"}
          </button>
          <div style={{ fontFamily: "monospace" }}>
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </div>
          <div>
            <label htmlFor="speed-select" style={{ marginRight: "10px" }}>Speed:</label>
            <select id="speed-select" value={playbackRate} onChange={handleSpeedChange} style={{
                background: "#444",
                color: "white",
                border: "1px solid #666",
                borderRadius: "5px",
                padding: "5px",
            }}>
              <option value="0.5">0.5x</option>
              <option value="1">1x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>
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
