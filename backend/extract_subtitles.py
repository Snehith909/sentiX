import sys
import importlib

try:
    whisper = importlib.import_module("whisper")
except ImportError:
    print("Missing required package 'whisper'. Install with: pip install -U openai-whisper")
    sys.exit(1)

if len(sys.argv) < 3:
    print("Usage: python extract_subtitles.py input_video.mp4 output_subtitles.srt")
    sys.exit(1)


def format_timestamp(seconds):
    ms = int((seconds - int(seconds)) * 1000)
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"

input_video = sys.argv[1]
output_srt = sys.argv[2]
model = whisper.load_model("small")
result = model.transcribe(input_video)

with open(output_srt, "w", encoding="utf-8") as srt:
    for i, seg in enumerate(result["segments"], 1):
        start = format_timestamp(seg["start"])
        end = format_timestamp(seg["end"])
        text = seg["text"].strip()
        srt.write(f"{i}\n{start} --> {end}\n{text}\n\n")
