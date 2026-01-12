use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use notify_debouncer_full::{new_debouncer, DebounceEventResult, Debouncer, FileIdMap};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter};

/// File watcher state
pub struct FileWatcherState {
    watcher: Option<Debouncer<RecommendedWatcher, FileIdMap>>,
    watched_path: Option<PathBuf>,
}

impl FileWatcherState {
    pub fn new() -> Self {
        Self {
            watcher: None,
            watched_path: None,
        }
    }
}

/// Configuration for file watching
#[derive(Debug, Clone)]
pub struct WatchConfig {
    /// Debounce delay in milliseconds
    pub debounce_ms: u64,
    /// File extensions to watch
    pub extensions: Vec<String>,
    /// Directories to ignore
    pub ignored_dirs: Vec<String>,
}

impl Default for WatchConfig {
    fn default() -> Self {
        Self {
            debounce_ms: 300,
            extensions: vec![
                ".js".to_string(),
                ".jsx".to_string(),
                ".ts".to_string(),
                ".tsx".to_string(),
                ".json".to_string(),
            ],
            ignored_dirs: vec![
                "node_modules".to_string(),
                ".git".to_string(),
                "ios".to_string(),
                "android".to_string(),
                "dist".to_string(),
                "build".to_string(),
                ".expo".to_string(),
                "target".to_string(),
                ".next".to_string(),
                "coverage".to_string(),
            ],
        }
    }
}

/// Start watching a directory for file changes
pub fn start_watching(
    app_handle: AppHandle,
    path: PathBuf,
    config: WatchConfig,
    state: Arc<Mutex<FileWatcherState>>,
) -> Result<(), String> {
    // Stop existing watcher if any
    {
        let mut state = state.lock().unwrap();
        state.watcher = None;
        state.watched_path = None;
    }

    let app_handle_clone = app_handle.clone();
    let path_clone = path.clone();

    // Create debounced watcher
    let debouncer = new_debouncer(
        Duration::from_millis(config.debounce_ms),
        None,
        move |result: DebounceEventResult| {
            handle_file_event(result, &app_handle_clone, &path_clone, &config);
        },
    )
    .map_err(|e| format!("Failed to create watcher: {}", e))?;

    let mut watcher = debouncer;

    // Start watching the path recursively
    watcher
        .watcher()
        .watch(&path, RecursiveMode::Recursive)
        .map_err(|e| format!("Failed to watch path: {}", e))?;

    // Store the watcher
    {
        let mut state = state.lock().unwrap();
        state.watcher = Some(watcher);
        state.watched_path = Some(path.clone());
    }

    println!("Started watching: {:?}", path);
    Ok(())
}

/// Stop watching files
pub fn stop_watching(state: Arc<Mutex<FileWatcherState>>) {
    let mut state = state.lock().unwrap();
    if let Some(_watcher) = state.watcher.take() {
        println!("Stopped watching: {:?}", state.watched_path);
        state.watched_path = None;
    }
}

/// Handle file system events
fn handle_file_event(
    result: DebounceEventResult,
    app_handle: &AppHandle,
    watch_path: &Path,
    config: &WatchConfig,
) {
    match result {
        Ok(events) => {
            for event in events {
                if should_process_event(&event.event, watch_path, config) {
                    emit_file_change_event(app_handle, &event.event);
                }
            }
        }
        Err(errors) => {
            for error in errors {
                eprintln!("Watch error: {:?}", error);
            }
        }
    }
}

/// Check if an event should be processed
fn should_process_event(event: &Event, watch_path: &Path, config: &WatchConfig) -> bool {
    use notify::EventKind;

    // Only process modify and create events
    match event.kind {
        EventKind::Modify(_) | EventKind::Create(_) => {}
        _ => return false,
    }

    // Check if any path in the event should be processed
    for path in &event.paths {
        // Get relative path from watch root
        let relative_path = match path.strip_prefix(watch_path) {
            Ok(p) => p,
            Err(_) => continue,
        };

        // Check if path is in ignored directory
        if is_ignored_path(relative_path, &config.ignored_dirs) {
            continue;
        }

        // Check if file has watched extension
        if let Some(extension) = path.extension() {
            let ext = format!(".{}", extension.to_string_lossy());
            if config.extensions.contains(&ext) {
                return true;
            }
        }
    }

    false
}

/// Check if a path should be ignored
fn is_ignored_path(path: &Path, ignored_dirs: &[String]) -> bool {
    for component in path.components() {
        if let Some(component_str) = component.as_os_str().to_str() {
            if ignored_dirs.contains(&component_str.to_string()) {
                return true;
            }
        }
    }
    false
}

/// Emit file change event to frontend
fn emit_file_change_event(app_handle: &AppHandle, event: &Event) {
    let changed_files: Vec<String> = event
        .paths
        .iter()
        .filter_map(|p| p.to_str().map(|s| s.to_string()))
        .collect();

    #[derive(Clone, serde::Serialize)]
    struct FileChangePayload {
        files: Vec<String>,
        timestamp: u64,
    }

    let payload = FileChangePayload {
        files: changed_files.clone(),
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs(),
    };

    println!("File changed: {:?}", changed_files);

    if let Err(e) = app_handle.emit("file_changed", payload) {
        eprintln!("Failed to emit file change event: {}", e);
    }
}
