use parakeet_rs::{ParakeetTDT, TimestampMode, Transcriber};
use std::env;
use std::path::PathBuf;
use std::time::Instant;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut args = env::args().skip(1);

    let model_dir = PathBuf::from(
        args.next()
            .ok_or("usage: cargo run --example parakeet_ab -- <model_dir> <wav_path>")?,
    );
    let wav_path = PathBuf::from(
        args.next()
            .ok_or("usage: cargo run --example parakeet_ab -- <model_dir> <wav_path>")?,
    );

    let started = Instant::now();
    let mut model = ParakeetTDT::from_pretrained(&model_dir, None)?;
    let loaded = started.elapsed();

    let transcribe_started = Instant::now();
    let result = model.transcribe_file(&wav_path, Some(TimestampMode::Sentences))?;
    let transcribed = transcribe_started.elapsed();

    println!("MODEL_DIR={}", model_dir.display());
    println!("WAV_PATH={}", wav_path.display());
    println!("LOAD_MS={}", loaded.as_millis());
    println!("TRANSCRIBE_MS={}", transcribed.as_millis());
    println!("TEXT_BEGIN");
    println!("{}", result.text);
    println!("TEXT_END");

    Ok(())
}
