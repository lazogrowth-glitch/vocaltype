use std::path::PathBuf;
use std::time::Instant;
use transcribe_rs::engines::whisper::{WhisperEngine, WhisperInferenceParams, WhisperModelParams};
use transcribe_rs::TranscriptionEngine;

fn load_wav(path: &PathBuf) -> Result<(Vec<f32>, u32, u16), Box<dyn std::error::Error>> {
    let mut reader = hound::WavReader::open(path)?;
    let spec = reader.spec();
    let samples = match spec.sample_format {
        hound::SampleFormat::Float => reader.samples::<f32>().collect::<Result<Vec<_>, _>>()?,
        hound::SampleFormat::Int => {
            let max = ((1_i64 << (spec.bits_per_sample - 1)) - 1) as f32;
            reader
                .samples::<i32>()
                .map(|s| s.map(|v| v as f32 / max))
                .collect::<Result<Vec<_>, _>>()?
        }
    };
    Ok((samples, spec.sample_rate, spec.channels))
}

fn mono_resample_16k(
    samples: Vec<f32>,
    sample_rate: u32,
    channels: u16,
) -> Result<Vec<f32>, Box<dyn std::error::Error>> {
    let mono = if channels == 1 {
        samples
    } else {
        samples
            .chunks_exact(channels as usize)
            .map(|frame| frame.iter().copied().sum::<f32>() / channels as f32)
            .collect::<Vec<_>>()
    };

    if sample_rate == 16_000 {
        return Ok(mono);
    }

    let ratio = 16_000.0 / sample_rate as f32;
    let out_len = (mono.len() as f32 * ratio).round() as usize;
    let mut out = Vec::with_capacity(out_len);
    for i in 0..out_len {
        let src_pos = i as f32 / ratio;
        let left = src_pos.floor() as usize;
        let right = (left + 1).min(mono.len().saturating_sub(1));
        let frac = src_pos - left as f32;
        let left_val = mono.get(left).copied().unwrap_or(0.0);
        let right_val = mono.get(right).copied().unwrap_or(left_val);
        out.push(left_val + (right_val - left_val) * frac);
    }
    Ok(out)
}

fn deduplicate_boundary(prev: &str, next: &str) -> String {
    let prev_words: Vec<&str> = prev.split_whitespace().collect();
    let next_words: Vec<&str> = next.split_whitespace().collect();
    if prev_words.is_empty() || next_words.is_empty() {
        return next.to_string();
    }
    let max_overlap = 8.min(prev_words.len()).min(next_words.len());
    for n in (1..=max_overlap).rev() {
        let prev_suffix: Vec<String> = prev_words[prev_words.len() - n..]
            .iter()
            .map(|w| {
                w.to_lowercase()
                    .trim_matches(|c: char| !c.is_alphanumeric())
                    .to_string()
            })
            .collect();
        let next_prefix: Vec<String> = next_words[..n]
            .iter()
            .map(|w| {
                w.to_lowercase()
                    .trim_matches(|c: char| !c.is_alphanumeric())
                    .to_string()
            })
            .collect();
        if prev_suffix == next_prefix {
            return next_words[n..].join(" ");
        }
    }
    next.to_string()
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut args = std::env::args().skip(1);
    let model_path = PathBuf::from(args.next().ok_or("missing model path")?);
    let audio_path = PathBuf::from(args.next().ok_or("missing audio path")?);
    let language = args.next().unwrap_or_else(|| "fr".to_string());
    let use_gpu = args.next().map(|value| value != "cpu").unwrap_or(true);
    let seconds_override = args.next().map(|value| {
        value
            .split(',')
            .filter_map(|part| part.trim().parse::<usize>().ok())
            .collect::<Vec<_>>()
    });
    let thread_override = args.next().map(|value| {
        value
            .split(',')
            .filter_map(|part| part.trim().parse::<i32>().ok())
            .collect::<Vec<_>>()
    });

    let (samples, sample_rate, channels) = load_wav(&audio_path)?;
    let audio = mono_resample_16k(samples, sample_rate, channels)?;
    let audio_secs = audio.len() as f32 / 16_000.0;

    let second_values = seconds_override.unwrap_or_else(|| vec![4, 5, 6, 7, 8, 10]);
    let thread_values = thread_override.unwrap_or_else(|| vec![2, 4, 6, 8]);

    for threads in thread_values {
        let mut engine = WhisperEngine::new();
        engine.load_model_with_params(
            &model_path,
            WhisperModelParams {
                use_gpu,
                flash_attn: use_gpu,
            },
        )?;

        let params = WhisperInferenceParams {
            language: Some(language.clone()),
            translate: false,
            greedy_best_of: Some(1),
            n_threads: Some(threads),
            debug_mode: false,
            no_context: true,
            no_timestamps: true,
            single_segment: true,
            temperature: Some(0.0),
            temperature_inc: Some(0.0),
            entropy_thold: Some(9_999.0),
            logprob_thold: Some(-9_999.0),
            ..Default::default()
        };

        for seconds in &second_values {
            let interval = seconds * 16_000;
            let overlap = 8_000usize;
            let mut start = 0usize;
            let mut chunks = Vec::new();
            while start < audio.len() {
                let end = (start + interval).min(audio.len());
                let chunk_start = start.saturating_sub(overlap);
                chunks.push(audio[chunk_start..end].to_vec());
                if end == audio.len() {
                    break;
                }
                start = end;
            }

            let bench_start = Instant::now();
            let mut texts = Vec::new();
            for chunk in &chunks {
                let tx_start = Instant::now();
                let result = engine.transcribe_samples(chunk.clone(), Some(params.clone()))?;
                let tx_ms = tx_start.elapsed().as_millis();
                texts.push(result.text);
                println!(
                    "CHUNK threads={} seconds={} len_s={:.2} tx_ms={}",
                    threads,
                    seconds,
                    chunk.len() as f32 / 16_000.0,
                    tx_ms
                );
            }

            let assembled = if texts.is_empty() {
                String::new()
            } else {
                let mut out = vec![texts[0].clone()];
                for i in 1..texts.len() {
                    let cleaned = deduplicate_boundary(&texts[i - 1], &texts[i]);
                    if !cleaned.is_empty() {
                        out.push(cleaned);
                    }
                }
                out.join(" ")
            };

            let total_ms = bench_start.elapsed().as_millis();
            println!(
                "SUMMARY threads={} seconds={} chunks={} audio_s={:.2} total_ms={} chars={} text={}",
                threads,
                seconds,
                chunks.len(),
                audio_secs,
                total_ms,
                assembled.chars().count(),
                assembled.replace('\n', " ")
            );
        }
    }

    Ok(())
}
