use parakeet_rs::{ExecutionConfig, ExecutionProvider, ParakeetTDT, TimestampMode, Transcriber};
use std::path::PathBuf;
use std::time::Instant;

#[derive(Clone, Copy)]
struct ProviderCase {
    name: &'static str,
    provider: ExecutionProvider,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut args = std::env::args().skip(1);
    let model_dir = PathBuf::from(args.next().ok_or("missing model dir")?);
    let audio_path = PathBuf::from(args.next().ok_or("missing audio path")?);

    let mut cases = vec![ProviderCase {
        name: "cpu",
        provider: ExecutionProvider::Cpu,
    }];

    #[cfg(target_os = "windows")]
    {
        cases.push(ProviderCase {
            name: "directml",
            provider: ExecutionProvider::DirectML,
        });
        cases.push(ProviderCase {
            name: "openvino_gpu",
            provider: ExecutionProvider::OpenVinoGpu,
        });
        cases.push(ProviderCase {
            name: "openvino_npu",
            provider: ExecutionProvider::OpenVinoNpu,
        });
        #[cfg(target_arch = "aarch64")]
        cases.push(ProviderCase {
            name: "qnn",
            provider: ExecutionProvider::Qnn,
        });
    }

    let intra_threads = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(4)
        .min(8);

    for case in cases {
        println!("CASE={}", case.name);
        let load_start = Instant::now();
        let mut engine = match ParakeetTDT::from_pretrained(
            &model_dir,
            Some(
                ExecutionConfig::new()
                    .with_execution_provider(case.provider)
                    .with_intra_threads(intra_threads)
                    .with_inter_threads(1),
            ),
        ) {
            Ok(engine) => engine,
            Err(err) => {
                println!("STATUS=load_failed");
                println!("ERROR={}", err);
                continue;
            }
        };
        println!("LOAD_MS={}", load_start.elapsed().as_millis());

        let tx_start = Instant::now();
        match engine.transcribe_file(&audio_path, Some(TimestampMode::Sentences)) {
            Ok(result) => {
                println!("STATUS=ok");
                println!("TRANSCRIBE_MS={}", tx_start.elapsed().as_millis());
                println!("TEXT={}", result.text);
            }
            Err(err) => {
                println!("STATUS=transcribe_failed");
                println!("TRANSCRIBE_MS={}", tx_start.elapsed().as_millis());
                println!("ERROR={}", err);
            }
        }
    }

    Ok(())
}
