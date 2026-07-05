use std::fs::File;
use std::io::Write;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;
use serde_json::json;

use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
};

struct ProxyState {
    child_process: Mutex<Option<CommandChild>>,
}

#[tauri::command]
async fn start_proxy(
    app: AppHandle, 
    state: State<'_, ProxyState>, 
    token: String, 
    local_port: u16,
    custom_sni: String,
    share_local: bool // ДОБАВИЛИ ФЛАГ ШЕРИНГА С ФРОНТЕНДА
) -> Result<(), String> {
    let client = reqwest::Client::new();
    let response = client
        .get("https://api.stealthsurf.net/configs") 
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| format!("Ошибка обращения к API: {}", e))?;

    if !response.status().is_success() {
        return Err("Не удалось получить конфигурацию (проверьте токен)".into());
    }

    let ss_configs: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;

    let data_array = ss_configs["data"].as_array().ok_or("Поле 'data' отсутствует или не является массивом")?;
    let config_node = data_array.get(0).ok_or("Список конфигураций пуст")?;

    let connection_url = config_node["connection_url"].as_str().ok_or("Поле connection_url отсутствует")?;

    let parsed_url = url::Url::parse(connection_url).map_err(|e| format!("Ошибка парсинга ссылки: {}", e))?;
    
    let uuid = parsed_url.username().to_string();
    let server = parsed_url.host_str().ok_or("Не удалось извлечь IP сервера из ссылки")?.to_string();
    let port = parsed_url.port().ok_or("Не удалось извлечь порт сервера из ссылки")?;

    let mut pbk = String::new();
    let mut sid = String::new();
    let mut flow = String::new();
    let mut sni = String::new();
    let mut fp = String::from("chrome");

    for (key, val) in parsed_url.query_pairs() {
        match key.as_ref() {
            "pbk" => pbk = val.into_owned(),
            "sid" => sid = val.into_owned(),
            "flow" => flow = val.into_owned(),
            "sni" => sni = val.into_owned(),
            "fp" => fp = val.into_owned(),
            _ => {}
        }
    }

    if sni.is_empty() {
        sni = custom_sni; 
    }

    // Если шаринг включен — слушаем 0.0.0.0 (всю локальную сеть), иначе — строго локальный 127.0.0.1
    let listen_address = if share_local { "0.0.0.0" } else { "127.0.0.1" };

    let singbox_config = json!({
        "inbounds": [
            {
                "type": "socks",
                "tag": "socks-in",
                "listen": listen_address,
                "listen_port": local_port
            }
        ],
        "outbounds": [
            {
                "type": "vless",
                "tag": "proxy-out",
                "server": server,
                "server_port": port,
                "uuid": uuid,
                "flow": if flow.is_empty() { "xtls-rprx-vision" } else { &flow },
                "tls": {
                    "enabled": true,
                    "server_name": sni,
                    "insecure": true, 
                    "utls": {
                        "enabled": true,
                        "fingerprint": fp
                    },
                    "reality": {
                        "enabled": true,
                        "public_key": pbk,
                        "short_id": sid
                    }
                }
            }
        ],
        "route": {
            "rules": [
                {
                    "inbound": "socks-in",
                    "outbound": "proxy-out"
                }
            ]
        }
    });

    let app_dir = app.path().app_local_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    let config_path = app_dir.join("singbox_config.json");

    let mut file = File::create(&config_path).map_err(|e| e.to_string())?;
    file.write_all(singbox_config.to_string().as_bytes()).map_err(|e| e.to_string())?;

    let shell = app.shell();
    let sidecar_command = shell
        .sidecar("sing-box")
        .map_err(|e| format!("Ошибка создания sidecar: {}", e))?
        .args(["run", "-c", config_path.to_str().unwrap()]);

    let (mut rx, child) = sidecar_command
        .spawn()
        .map_err(|e| format!("Ошибка запуска процесса sing-box: {}", e))?;

    tauri::async_runtime::spawn(async move {
        use tauri_plugin_shell::process::CommandEvent;
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    if let Ok(text) = std::str::from_utf8(&line) {
                        println!("[sing-box OUT] {}", text.trim());
                    }
                }
                CommandEvent::Stderr(line) => {
                    if let Ok(text) = std::str::from_utf8(&line) {
                        eprintln!("[sing-box ERR] {}", text.trim());
                    }
                }
                _ => {}
            }
        }
    });

    let mut active_child = state.child_process.lock().unwrap();
    *active_child = Some(child);

    Ok(())
}

#[tauri::command]
fn stop_proxy(state: State<'_, ProxyState>) -> Result<(), String> {
    let mut active_child = state.child_process.lock().unwrap();
    if let Some(child) = active_child.take() {
        child.kill().map_err(|e| format!("Не удалось остановить процесс: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
fn open_telegram(port: u16) -> Result<(), String> {
    let url = format!("tg://socks?server=127.0.0.1&port={}", port);
    
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("powershell")
            .args(["-Command", &format!("Start-Process '{}'", url)])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
fn set_autostart(enabled: bool) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let exe_path = std::env::current_exe()
            .map_err(|e| e.to_string())?
            .to_string_lossy()
            .to_string();

        if enabled {
            let exe_path_with_arg = format!("\"{}\" --autostart", exe_path);
            std::process::Command::new("reg")
                .args([
                    "add",
                    "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
                    "/v",
                    "tgproxy",
                    "/t",
                    "REG_SZ",
                    "/d",
                    &exe_path_with_arg,
                    "/f",
                ])
                .spawn()
                .map_err(|e| e.to_string())?;
        } else {
            std::process::Command::new("reg")
                .args([
                    "delete",
                    "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
                    "/v",
                    "tgproxy",
                    "/f",
                ])
                .spawn()
                .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

// ----------------------------------------------------
// НОВАЯ КОМАНДА: АВТОМАТИЧЕСКИЙ ПОИСК ЛОКАЛЬНОГО IP НА ПК
// ----------------------------------------------------
#[tauri::command]
fn get_local_ip() -> Result<String, String> {
    use std::net::UdpSocket;
    // Гениальный сетевой трюк: подключаемся к фейковому внешнему DNS-адресу.
    // Пакеты на самом деле не отправляются, но ОС вынуждена выдать сокету активный IP нашей Wi-Fi/Ethernet карты.
    let socket = UdpSocket::bind("0.0.0.0:0").map_err(|e| e.to_string())?;
    socket.connect("8.8.8.8:80").map_err(|e| e.to_string())?;
    let local_addr = socket.local_addr().map_err(|e| e.to_string())?;
    Ok(local_addr.ip().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(ProxyState {
            child_process: Mutex::new(None),
        })
        // Не забыли зарегистрировать get_local_ip!
        .invoke_handler(tauri::generate_handler![start_proxy, stop_proxy, open_telegram, set_autostart, get_local_ip])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                window.hide().unwrap();
                api.prevent_close(); 
            }
        })
        .setup(|app| {
            let args: Vec<String> = std::env::args().collect();
            let start_minimized = args.iter().any(|arg| arg == "--autostart");

            if start_minimized {
                if let Some(window) = app.get_webview_window("main") {
                    window.hide().unwrap(); 
                }
            }

            let quit_item = MenuItem::with_id(app, "quit", "Выйти", true, None::<&str>)?;
            let show_item = MenuItem::with_id(app, "show", "Показать окно", true, None::<&str>)?;
            
            let tray_menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("StealthSurf TG Proxy")
                .menu(&tray_menu)
                .show_menu_on_left_click(false) 
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "quit" => {
                            app.exit(0); 
                        }
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                window.show().unwrap();
                                window.set_focus().unwrap();
                            }
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: tauri::tray::MouseButton::Left, .. } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            window.show().unwrap();
                            window.set_focus().unwrap();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}