import base64
import os

import streamlit.components.v1 as components

_RELEASE = True

if not _RELEASE:
    _component_func = components.declare_component(
        "waveform_player",
        url="http://localhost:3001",
    )
else:
    parent_dir = os.path.dirname(os.path.abspath(__file__))
    build_dir = os.path.join(parent_dir, "frontend/build")
    _component_func = components.declare_component("waveform_player", path=build_dir)


def waveform_player(
    audio_bytes: bytes, key=None, height: int = 120, show_controls: bool = True
):
    """Create a new instance of "waveform_player".

    Parameters
    ----------
    audio_bytes: bytes
        The audio file to display and play.
    key: str or None
        An optional key that uniquely identifies this component.
    height: int
        The height of the waveform display.
    show_controls: bool
        Whether to show the audio controls.
    """
    # The audio bytes are base64 encoded to be sent to the frontend
    audio_b64 = base64.b64encode(audio_bytes).decode()

    component_value = _component_func(
        audio_b64=audio_b64,
        height=height,
        show_controls=show_controls,
        key=key,
        default=0,
    )
    return component_value


if not _RELEASE:
    import streamlit as st

    st.set_page_config(layout="wide")

    st.title("Waveform Player Component Dev")

    audio_file = st.file_uploader("Upload an audio file", type=["wav", "mp3", "ogg"])

    if audio_file:
        audio_bytes = audio_file.read()
        st.subheader("Waveform Player")
        waveform_player(audio_bytes=audio_bytes)
