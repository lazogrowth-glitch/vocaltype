# VocalType

VocalType is a desktop speech-to-text application built with Tauri, Rust, React, and TypeScript.

## Development

```bash
bun install
bun run tauri dev
bun run tauri build
```

## Model Setup

```bash
mkdir -p src-tauri/resources/models
curl -o src-tauri/resources/models/silero_vad_v4.onnx https://downloads.vocaltypeai.com/models/silero_vad_v4.onnx
```

## CLI

```bash
vocaltype --toggle-transcription
vocaltype --toggle-post-process
vocaltype --cancel
vocaltype --start-hidden
vocaltype --no-tray
vocaltype --debug
```

On macOS, the bundled binary can be launched directly:

```bash
/Applications/VocalType.app/Contents/MacOS/VocalType --toggle-transcription
```

## Manual Model Installation

Typical app data directories:

- macOS: `~/Library/Application Support/com.vocaltype.desktop/`
- Windows: `%APPDATA%\com.vocaltype.desktop\`
- Linux: `~/.config/com.vocaltype.desktop/`

Create the models directory:

```bash
mkdir -p "{app_data_dir}/models"
```

Model downloads:

- Small: `https://downloads.vocaltypeai.com/models/ggml-small.bin`
- Medium: `https://downloads.vocaltypeai.com/models/whisper-medium-q4_1.bin`
- Turbo: `https://downloads.vocaltypeai.com/models/ggml-large-v3-turbo.bin`
- Large: `https://downloads.vocaltypeai.com/models/ggml-large-v3-q5_0.bin`
- Parakeet V2: `https://downloads.vocaltypeai.com/models/parakeet-v2-int8.tar.gz`
- Parakeet V3: `https://downloads.vocaltypeai.com/models/parakeet-v3-int8.tar.gz`

## License

MIT. See [LICENSE](LICENSE).
