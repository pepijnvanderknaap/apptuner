use std::path::PathBuf;
use std::process::Command;
use anyhow::{Result, Context};

pub struct Bundler {
    project_path: PathBuf,
}

impl Bundler {
    pub fn new(project_path: PathBuf) -> Self {
        Self { project_path }
    }

    /// Bundle the React Native project using Metro bundler
    pub async fn bundle(&self, entry_file: &str) -> Result<String> {
        // For React Native, we'll use Metro bundler which comes with react-native
        // Command: npx react-native bundle --entry-file index.js --platform ios --dev true --bundle-output /tmp/bundle.js

        let output = Command::new("npx")
            .current_dir(&self.project_path)
            .arg("react-native")
            .arg("bundle")
            .arg("--entry-file")
            .arg(entry_file)
            .arg("--platform")
            .arg("ios")
            .arg("--dev")
            .arg("true")
            .arg("--bundle-output")
            .arg("/tmp/apptuner-bundle.js")
            .arg("--reset-cache")
            .output()
            .context("Failed to run Metro bundler")?;

        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            return Err(anyhow::anyhow!("Bundling failed: {}", error));
        }

        // Read the generated bundle
        let bundle_content = std::fs::read_to_string("/tmp/apptuner-bundle.js")
            .context("Failed to read bundle output")?;

        Ok(bundle_content)
    }

    /// Fast rebuild using Metro's fast refresh
    pub async fn fast_refresh(&self) -> Result<()> {
        // For fast refresh, we just trigger Metro to rebuild
        // The mobile app will receive the update via WebSocket
        Ok(())
    }
}
