#!/usr/bin/env python3
"""
Petrichor Startpage System Stats Server
Lightweight daemon serving live system stats and system info to Petrichor.
Pure standard library Python 3. Binds to 127.0.0.1:9191.
"""

import datetime
import glob
import json
import mimetypes
import os
import platform
import shutil
import subprocess
import threading
import time
from http.server import HTTPServer, BaseHTTPRequestHandler

HOST = "127.0.0.1"
PORT = 9191

current_stats = {
    "cpu": "0%",
    "cpu_val": 0,
    "ram": "0%",
    "ram_val": 0,
    "down": "0 B/s",
    "up": "0 B/s",
    "gpu": "—",
    "gpu_val": None,
    "temp": "—",
    "temp_val": None,
    "disk": "—",
    "disk_val": None,
    "swap": "—",
    "swap_val": None,
}
stats_lock = threading.Lock()


def format_speed(b):
    if b < 1024:
        return f"{int(b)} B/s"
    elif b < 1024 * 1024:
        return f"{b / 1024:.1f} KB/s"
    elif b < 1024 * 1024 * 1024:
        return f"{b / (1024 * 1024):.1f} MB/s"
    else:
        return f"{b / (1024 * 1024 * 1024):.2f} GB/s"


def read_proc_stat():
    try:
        with open("/proc/stat", "r") as f:
            fields = [float(x) for x in f.readline().split()[1:]]
        idle = fields[3] + (fields[4] if len(fields) > 4 else 0)
        total = sum(fields)
        return idle, total
    except Exception:
        return 0, 0


def read_proc_meminfo():
    try:
        mem = {}
        with open("/proc/meminfo", "r") as f:
            for line in f:
                parts = line.split(":")
                if len(parts) == 2:
                    val = parts[1].strip().split()[0]
                    mem[parts[0].strip()] = int(val)

        total = mem.get("MemTotal", 0)
        avail = mem.get("MemAvailable", mem.get("MemFree", 0))
        used = max(0, total - avail)
        pct = (used / total * 100) if total > 0 else 0

        swap_total = mem.get("SwapTotal", 0)
        swap_free = mem.get("SwapFree", 0)
        swap_used = max(0, swap_total - swap_free)
        swap_pct = (swap_used / swap_total * 100) if swap_total > 0 else 0

        return int(round(pct)), int(round(swap_pct))
    except Exception:
        return 0, 0


def read_disk_usage():
    try:
        usage = shutil.disk_usage(os.path.expanduser("~"))
        pct = (usage.used / usage.total * 100) if usage.total > 0 else 0
        return int(round(pct))
    except Exception:
        return None


def read_cpu_temp():
    try:
        # Search hwmon coretemp or thermal_zone
        for path in sorted(glob.glob("/sys/class/hwmon/hwmon*/temp*_input")):
            try:
                with open(path, "r") as f:
                    val = int(f.read().strip())
                    if 0 < val < 130000:
                        return int(round(val / 1000.0))
            except Exception:
                continue
        for path in glob.glob("/sys/class/thermal/thermal_zone*/temp"):
            try:
                with open(path, "r") as f:
                    val = int(f.read().strip())
                    if 0 < val < 130000:
                        return int(round(val / 1000.0))
            except Exception:
                continue
    except Exception:
        pass
    return None


def read_gpu_usage():
    try:
        out = subprocess.check_output(
            ["nvidia-smi", "--query-gpu=utilization.gpu", "--format=csv,noheader,nounits"],
            stderr=subprocess.DEVNULL,
            timeout=1,
        ).decode().strip()
        val = int(out.split("\n")[0].strip())
        return val
    except Exception:
        pass
    return None


def read_net_dev():
    rx = 0
    tx = 0
    try:
        with open("/proc/net/dev", "r") as f:
            lines = f.readlines()[2:]
        for line in lines:
            parts = line.split(":")
            if len(parts) == 2:
                iface = parts[0].strip()
                if iface == "lo" or iface.startswith("docker") or iface.startswith("veth") or iface.startswith("br-"):
                    continue
                nums = parts[1].split()
                if len(nums) >= 9:
                    rx += int(nums[0])
                    tx += int(nums[8])
    except Exception:
        pass
    return rx, tx


def get_os_age():
    try:
        # Check root filesystem creation or install logs
        for path in ["/var/log/pacman.log", "/var/log/dpkg.log", "/etc/machine-id"]:
            if os.path.exists(path):
                mtime = os.stat(path).st_mtime
                days = int((time.time() - mtime) / 86400)
                if days >= 0:
                    return f"{days} days"
    except Exception:
        pass
    return "—"


def get_uptime_string():
    try:
        with open("/proc/uptime", "r") as f:
            total_sec = int(float(f.readline().split()[0]))
        h = total_sec // 3600
        m = (total_sec % 3600) // 60
        if h > 0:
            return f"{h}h {m}m"
        return f"{m}m"
    except Exception:
        return "—"


def get_system_info():
    user = os.environ.get("USER") or "user"
    os_name = "Linux"
    try:
        with open("/etc/os-release", "r") as f:
            for line in f:
                if line.startswith("PRETTY_NAME="):
                    os_name = line.split("=", 1)[1].strip().strip('"')
                    break
    except Exception:
        pass

    kernel = platform.release()
    wm = os.environ.get("XDG_CURRENT_DESKTOP") or os.environ.get("DESKTOP_SESSION") or "Hyprland"

    return {
        "user": user,
        "os": os_name,
        "os_age": get_os_age(),
        "kernel": kernel,
        "uptime": get_uptime_string(),
        "wm": wm,
        "shell": os.environ.get("SHELL", "/bin/sh").split("/")[-1],
        "palette": "default",
    }


def stats_collector():
    last_idle, last_total = read_proc_stat()
    last_rx, last_tx = read_net_dev()

    while True:
        time.sleep(1.0)
        idle, total = read_proc_stat()
        diff_total = total - last_total
        diff_idle = idle - last_idle
        cpu_pct = 0
        if diff_total > 0:
            cpu_pct = max(0, min(100, int(round((1.0 - (diff_idle / diff_total)) * 100))))
        last_idle, last_total = idle, total

        ram_pct, swap_pct = read_proc_meminfo()
        disk_pct = read_disk_usage()
        temp_val = read_cpu_temp()
        gpu_val = read_gpu_usage()

        rx, tx = read_net_dev()
        down_speed = max(0, rx - last_rx)
        up_speed = max(0, tx - last_tx)
        last_rx, last_tx = rx, tx

        with stats_lock:
            current_stats["cpu"] = f"{cpu_pct}%"
            current_stats["cpu_val"] = cpu_pct
            current_stats["ram"] = f"{ram_pct}%"
            current_stats["ram_val"] = ram_pct
            current_stats["down"] = format_speed(down_speed)
            current_stats["up"] = format_speed(up_speed)
            current_stats["gpu"] = f"{gpu_val}%" if gpu_val is not None else "—"
            current_stats["gpu_val"] = gpu_val
            current_stats["temp"] = f"{temp_val}°C" if temp_val is not None else "—"
            current_stats["temp_val"] = temp_val
            current_stats["disk"] = f"{disk_pct}%" if disk_pct is not None else "—"
            current_stats["disk_val"] = disk_pct
            current_stats["swap"] = f"{swap_pct}%" if swap_pct is not None else "—"
            current_stats["swap_val"] = swap_pct


class StatsHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # Quiet logging

    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors_headers()
        self.end_headers()

    def do_GET(self):
        path = self.path.split("?")[0]
        if path in ("/stats", "/"):
            with stats_lock:
                payload = dict(current_stats)
            payload["system"] = get_system_info()
            body = json.dumps(payload).encode("utf-8")
            self.send_response(200)
            self.send_cors_headers()
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
            self.end_headers()
            self.wfile.write(body)
        elif path == "/avatar":
            # Search common avatar locations
            home = os.path.expanduser("~")
            avatar_path = None
            for candidate in [
                os.path.join(home, ".face"),
                os.path.join(home, ".face.icon"),
                os.path.join(home, ".config/noctalia/avatar.png"),
                os.path.join(home, ".config/noctalia/avatar.jpg"),
            ]:
                if os.path.isfile(candidate):
                    avatar_path = candidate
                    break

            if avatar_path and os.path.isfile(avatar_path):
                try:
                    with open(avatar_path, "rb") as f:
                        data = f.read()
                    ctype = mimetypes.guess_type(avatar_path)[0] or "image/png"
                    self.send_response(200)
                    self.send_cors_headers()
                    self.send_header("Content-Type", ctype)
                    self.send_header("Content-Length", str(len(data)))
                    self.end_headers()
                    self.wfile.write(data)
                    return
                except Exception:
                    pass

            self.send_response(404)
            self.send_cors_headers()
            self.end_headers()
        else:
            self.send_response(404)
            self.send_cors_headers()
            self.end_headers()


def main():
    collector = threading.Thread(target=stats_collector, daemon=True)
    collector.start()
    server = HTTPServer((HOST, PORT), StatsHandler)
    print(f"Petrichor Stats Server listening on http://{HOST}:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
