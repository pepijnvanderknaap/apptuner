use tauri::Manager;
use std::path::PathBuf;
use std::fs;
use std::sync::{Arc, Mutex};

mod watcher;
mod bundler;

use watcher::{FileWatcherState, WatchConfig, start_watching, stop_watching};
use bundler::Bundler;

// Global state for file watcher
struct AppState {
    watcher: Arc<Mutex<FileWatcherState>>,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
struct ProjectInfo {
    name: String,
    path: String,
    is_valid: bool,
    has_package_json: bool,
    has_app_entry: bool,
}

/// Validate if the selected folder is a React Native project
#[tauri::command]
fn validate_project(path: String) -> Result<ProjectInfo, String> {
    let project_path = PathBuf::from(&path);

    if !project_path.exists() {
        return Err("Path does not exist".to_string());
    }

    let name = project_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Unknown")
        .to_string();

    let package_json_path = project_path.join("package.json");
    let has_package_json = package_json_path.exists();

    // Check for common React Native entry points
    let has_app_entry = project_path.join("App.tsx").exists()
        || project_path.join("App.js").exists()
        || project_path.join("src/App.tsx").exists()
        || project_path.join("src/App.js").exists()
        || project_path.join("index.js").exists();

    let is_valid = has_package_json && has_app_entry;

    Ok(ProjectInfo {
        name,
        path,
        is_valid,
        has_package_json,
        has_app_entry,
    })
}

/// Read package.json to extract project metadata
#[tauri::command]
fn read_package_json(path: String) -> Result<String, String> {
    let package_path = PathBuf::from(path).join("package.json");
    fs::read_to_string(package_path)
        .map_err(|e| format!("Failed to read package.json: {}", e))
}

/// Start watching a project directory for file changes
#[tauri::command]
fn start_file_watcher(
    app_handle: tauri::AppHandle,
    path: String,
    state: tauri::State<AppState>,
) -> Result<(), String> {
    let watch_path = PathBuf::from(path);
    let config = WatchConfig::default();

    start_watching(
        app_handle,
        watch_path,
        config,
        state.watcher.clone(),
    )
}

/// Stop watching files
#[tauri::command]
fn stop_file_watcher(state: tauri::State<AppState>) -> Result<(), String> {
    stop_watching(state.watcher.clone());
    Ok(())
}

/// Bundle the React Native project
#[tauri::command]
async fn bundle_project(project_path: String, entry_file: String) -> Result<String, String> {
    let bundler = Bundler::new(PathBuf::from(project_path));
    bundler.bundle(&entry_file)
        .await
        .map_err(|e| format!("Bundling failed: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize app state
    let watcher_state = Arc::new(Mutex::new(FileWatcherState::new()));
    let app_state = AppState {
        watcher: watcher_state,
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            validate_project,
            read_package_json,
            start_file_watcher,
            stop_file_watcher,
            bundle_project,
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
