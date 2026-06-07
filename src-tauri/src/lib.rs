use std::path::PathBuf;
use std::process::Command; // Added for executing xcopy

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_packages_dir() -> Result<String, String> {
    let mut path = std::env::current_exe().map_err(|e| e.to_string())?;
    path.pop();
    path.push("packages");
    Ok(path.to_string_lossy().into_owned())
}
#[tauri::command]
fn open_studio_dir() -> Result<String, String> {
    let local_app_data = std::env::var("LOCALAPPDATA")
        .map_err(|_| "Could not find LOCALAPPDATA environment variable.".to_string())?;
    
    let versions_dir = std::path::PathBuf::from(local_app_data).join("Roblox").join("Versions");

    if !versions_dir.exists() {
        return Err("Roblox Versions directory not found. Is Roblox installed?".to_string());
    }

    let mut studio_path = None;
    if let Ok(entries) = std::fs::read_dir(&versions_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() && path.join("RobloxStudioBeta.exe").exists() {
                studio_path = Some(path);
                break; // Found it!
            }
        }
    }

    let target_path = match studio_path {
        Some(p) => p,
        None => return Err("Could not find RobloxStudioBeta.exe in any version folder.".to_string()),
    };

    // OPEN THE FOLDER DIRECTLY FROM RUST!
    Command::new("explorer")
        .arg(&target_path)
        .spawn()
        .map_err(|e| format!("Failed to open folder: {}", e))?;

    Ok("Folder opened!".to_string())
}
#[tauri::command]
fn scan_packages() -> Result<Vec<String>, String> {
    let mut path = std::env::current_exe().map_err(|e| e.to_string())?;
    path.pop();
    path.push("packages");
    
    let mut folders = Vec::new();
    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries.flatten() {
            if let Ok(file_type) = entry.file_type() {
                if file_type.is_dir() {
                    folders.push(entry.file_name().to_string_lossy().into_owned());
                }
            }
        }
        Ok(folders)
    } else {
        Err("Folder missing".to_string())
    }
}

#[tauri::command]
fn read_thumb(folder_name: &str) -> Result<Vec<u8>, String> {
    let mut path = std::env::current_exe().map_err(|e| e.to_string())?;
    path.pop();
    path.push("packages");
    path.push(folder_name);
    path.push("thumb.png");
    
    std::fs::read(path).map_err(|e| e.to_string())
}

// THE NEW INSTALL BATCH REPLACEMENT
#[tauri::command]
fn apply_package(folder_name: &str) -> Result<String, String> {
    // 1. Get the source folder path (packages/folder_name)
    let mut source_path = std::env::current_exe().map_err(|e| e.to_string())?;
    source_path.pop();
    source_path.push("packages");
    source_path.push(folder_name);

    if !source_path.exists() {
        return Err(format!("Package folder not found: {}", folder_name));
    }

    // 2. Find Roblox Studio Directory
    let local_app_data = std::env::var("LOCALAPPDATA")
        .map_err(|_| "Could not find LOCALAPPDATA environment variable.".to_string())?;
    
    let versions_dir = std::path::PathBuf::from(local_app_data).join("Roblox").join("Versions");

    if !versions_dir.exists() {
        return Err("Roblox Versions directory not found. Is Roblox installed?".to_string());
    }

    let mut studio_path = None;
    if let Ok(entries) = std::fs::read_dir(&versions_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() && path.join("RobloxStudioBeta.exe").exists() {
                studio_path = Some(path);
                break; // Found it!
            }
        }
    }

    let target_path = match studio_path {
        Some(p) => p,
        None => return Err("Could not find RobloxStudioBeta.exe in any version folder.".to_string()),
    };

    // 3. Execute xcopy to mirror install.bat behavior completely silently
    let source_wildcard = format!("{}\\*", source_path.to_string_lossy());
    let target_dir = format!("{}\\", target_path.to_string_lossy());

    let output = Command::new("xcopy")
        .arg(&source_wildcard)
        .arg(&target_dir)
        .arg("/E") // Copy directories and subdirectories
        .arg("/Y") // Suppress overwrite prompts
        .arg("/C") // Continue even if errors occur (like locked d3d11.dll)
        .output()
        .map_err(|e| format!("Failed to execute background copy: {}", e))?;

    if output.status.success() {
        Ok("Files updated! Press F10 in Roblox Studio to reload your shaders.".to_string())
    } else {
        // With /C, it copies everything it can, but might error if the game is open and heavily locking a dll
        Ok("Copy finished, but some files may have been skipped (Close Roblox Studio if updates failed).".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init()) 
        .plugin(tauri_plugin_opener::init())
        // MAKE SURE TO REGISTER 'apply_package' HERE!
        .invoke_handler(tauri::generate_handler![greet, get_packages_dir, scan_packages, read_thumb, apply_package,open_studio_dir])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}