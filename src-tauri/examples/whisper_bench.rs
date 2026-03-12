use std::path::PathBuf;
use std::time::Instant;
use transcribe_rs::engines::whisper::{WhisperEngine, WhisperInferenceParams, WhisperModelParams};
use transcribe_rs::TranscriptionEngine;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut args = std::env::args().skip(1);
    let model_path = PathBuf::from(args.next().ok_or("missing model path")?);
    let audio_path = PathBuf::from(args.next().ok_or("missing audio path")?);
    let language = args.next();
    let mode = args.next().unwrap_or_else(|| "default".to_string());
    let use_gpu = args.next().map(|value| value != "cpu").unwrap_or(true);

    let mut engine = WhisperEngine::new();

    let load_start = Instant::now();
    engine.load_model_with_params(&model_path, WhisperModelParams { use_gpu })?;
    println!("LOAD_MS={}", load_start.elapsed().as_millis());

    let mut params = WhisperInferenceParams {
        language,
        translate: false,
        ..Default::default()
    };
    if mode == "turbo" {
        let threads = std::thread::available_parallelism()
            .map(|n| n.get())
            .unwrap_or(4)
            .min(8) as i32;
        params.greedy_best_of = Some(1);
        params.n_threads = Some(threads);
        params.debug_mode = false;
    }

    let tx_start = Instant::now();
    let result = engine.transcribe_file(&audio_path, Some(params))?;
    println!("TRANSCRIBE_MS={}", tx_start.elapsed().as_millis());
    println!("TEXT={}", result.text);

    Ok(())
}
