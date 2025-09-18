import React from "react"
import ReactDOM from "react-dom/client"
import WaveformPlayer from "./WaveformPlayer"

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement)
root.render(
  <React.StrictMode>
    <WaveformPlayer />
  </React.StrictMode>
)
