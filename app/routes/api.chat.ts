import Anthropic from "@anthropic-ai/sdk";
import type { Route } from "./+types/api.chat";

function calculate(expression: string): number {
    if (!/^[\d\s+\-*/().]+$/.test(expression)) throw new Error("Hanya angka dan + - * / ( )");
    const tokens = expression.match(/\d+(\.\d+)?|[+\-*/()]/g) ?? [];
    let i = 0;
    const peek = () => tokens[i];
    const next = () => tokens[i++];

    function factor(): number {            // angka, -angka, atau (…)
        const t = next();
        if (t === "-") return -factor();
        if (t === "(") {
            const v = sum();
            if (next() !== ")") throw new Error("Kurung tidak lengkap");
            return v;
        }
        const n = Number(t);
        if (t === undefined || Number.isNaN(n)) throw new Error("Ekspresi tidak valid");
        return n;
    }
    function product(): number {           // * dan / dihitung lebih dulu
        let v = factor();
        while (peek() === "*" || peek() === "/") v = next() === "*" ? v * factor() : v / factor();
        return v;
    }
    function sum(): number {               // lalu + dan -
        let v = product();
        while (peek() === "+" || peek() === "-") v = next() === "+" ? v + product() : v - product();
        return v;
    }

    const result = sum();
    if (i < tokens.length) throw new Error("Ekspresi tidak valid");
    return result;
}

// ── Registry tool: tiap tool = skema (dibaca model) + run (dijalankan kode kita) ──
type ToolDef = {
    schema: Anthropic.Tool;
    run: (input: any) => string | Promise<string>;   // boleh sync atau async
};

// ── Helper untuk tool yang memanggil internet ──
async function fetchJson(url: string, timeoutMs = 8000): Promise<any> {
    // Tanpa timeout, agent bisa menunggu selamanya kalau API lambat
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) throw new Error(`HTTP ${res.status} dari ${new URL(url).hostname}`);
    return res.json();
}

// Kode cuaca WMO → teks (dipakai Open-Meteo)
const WMO: Record<number, string> = {
    0: "cerah", 1: "cerah berawan", 2: "berawan sebagian", 3: "mendung",
    45: "berkabut", 48: "kabut beku",
    51: "gerimis ringan", 53: "gerimis", 55: "gerimis lebat",
    61: "hujan ringan", 63: "hujan sedang", 65: "hujan lebat",
    80: "hujan lokal ringan", 81: "hujan lokal sedang", 82: "hujan lokal lebat",
    95: "badai petir", 96: "badai petir + hujan es", 99: "badai petir + hujan es lebat",
};
const wmo = (code: number) => WMO[code] ?? `kode cuaca ${code}`;

async function getWeather(location: string, days = 1, hourly = false): Promise<string> {
    if (!location?.trim()) throw new Error("location wajib diisi");
    days = Math.min(Math.max(Math.round(days) || 1, 1), 7);

    // 1. Nama kota → koordinat
    const geo = await fetchJson(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=id&format=json`,
    );
    const place = geo.results?.[0];
    if (!place) return `Lokasi "${location}" tidak ditemukan. Coba nama kota yang lebih umum.`;

    // 2. Koordinat → cuaca
    const params = new URLSearchParams({
        latitude: String(place.latitude),
        longitude: String(place.longitude),
        current: "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation",
        daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum",
        timezone: "auto",
        forecast_days: String(days),
    });
    if (hourly) params.set("hourly", "temperature_2m,precipitation_probability,weather_code");
    const w = await fetchJson(`https://api.open-meteo.com/v1/forecast?${params}`);

    // 3. Ringkas jadi data kecil yang mudah dibaca model (hemat token)
    const c = w.current;
    const result: any = {
        lokasi: [place.name, place.admin1, place.country].filter(Boolean).join(", "),
        zona_waktu: w.timezone,
        sekarang: {
            waktu: c.time,
            suhu_c: c.temperature_2m,
            kelembapan_persen: c.relative_humidity_2m,
            kondisi: wmo(c.weather_code),
            angin_kmh: c.wind_speed_10m,
            hujan_mm: c.precipitation,
        },
        harian: w.daily.time.map((d: string, i: number) => ({
            tanggal: d,
            kondisi: wmo(w.daily.weather_code[i]),
            suhu_min_c: w.daily.temperature_2m_min[i],
            suhu_max_c: w.daily.temperature_2m_max[i],
            peluang_hujan_persen: w.daily.precipitation_probability_max[i],
            total_hujan_mm: w.daily.precipitation_sum[i],
        })),
    };
    if (hourly) {
        // per 3 jam saja, supaya tidak terlalu panjang
        result.per_3_jam = w.hourly.time
            .map((t: string, i: number) => ({
                jam: t,
                suhu_c: w.hourly.temperature_2m[i],
                peluang_hujan_persen: w.hourly.precipitation_probability[i],
                kondisi: wmo(w.hourly.weather_code[i]),
            }))
            .filter((_: unknown, i: number) => i % 3 === 0);
    }
    return JSON.stringify(result);
}

const TOOLS: Record<string, ToolDef> = {
    calculator: {
        schema: {
            name: "calculator",
            description: "Hitung ekspresi matematika, mis. '12 * 7 + 3'. Gunakan untuk perhitungan dengan angka besar atau banyak langkah.",
            input_schema: {
                type: "object",
                properties: { expression: { type: "string", description: "Hanya angka dan + - * / ( )" } },
                required: ["expression"],
            },
        },
        run: (input) => String(calculate(input.expression)),
    },

    get_current_time: {
        schema: {
            name: "get_current_time",
            description: "Ambil tanggal dan jam saat ini. Gunakan setiap kali pertanyaan menyangkut hari ini, sekarang, tanggal, jam, atau hari apa.",
            input_schema: {
                type: "object",
                properties: {
                    timezone: {
                        type: "string",
                        description: "Zona waktu IANA, mis. 'Asia/Jakarta', 'Asia/Tokyo'. Default 'Asia/Jakarta'.",
                    },
                },
            },
        },
        run: (input) => {
            const timezone = input?.timezone || "Asia/Jakarta";
            const now = new Date().toLocaleString("id-ID", {
                timeZone: timezone,          // zona salah → RangeError → ditangkap di runTool
                dateStyle: "full",
                timeStyle: "long",
            });
            return `${now} (${timezone})`;
        },
    },

    get_weather: {
        schema: {
            name: "get_weather",
            description:
                "Ambil cuaca terkini dan prakiraan cuaca (hingga 7 hari) untuk sebuah kota, dari Open-Meteo. " +
                "Gunakan untuk pertanyaan tentang cuaca, suhu, hujan, atau apakah perlu payung. " +
                "Set hourly=true kalau user butuh detail per jam (mis. jam berapa hujan / sebaiknya berangkat).",
            input_schema: {
                type: "object",
                properties: {
                    location: { type: "string", description: "Nama kota, mis. 'Bandung', 'Tokyo'" },
                    days: { type: "integer", description: "Jumlah hari prakiraan mulai hari ini, 1–7. Default 1. 'Besok' = 2." },
                    hourly: { type: "boolean", description: "Sertakan prakiraan per 3 jam. Default false." },
                },
                required: ["location"],
            },
        },
        run: (input) => getWeather(input.location, input.days, input.hourly),
    },
};

// Daftar skema yang dikirim ke model
const tools: Anthropic.Tool[] = Object.values(TOOLS).map((t) => t.schema);

async function runTool(name: string, input: any): Promise<string> {
    const tool = TOOLS[name];
    if (!tool) return `Error: tool tidak dikenal: ${name}`;
    try {
        return await tool.run(input);   // `await` penting: tanpa ini error async tidak tertangkap
    } catch (err) {
        return `Error: ${(err as Error).message}`;   // dikirim balik ke model supaya bisa coba lagi
    }
}
const MODEL = "deepseek-flash";
const MAX_TURNS = 5;                            // batas aman: maks 5 putaran

export async function action({ request, context }: Route.ActionArgs) {
    const { messages } = (await request.json()) as { messages: Anthropic.MessageParam[] };
    const client = new Anthropic({
        apiKey: context.cloudflare.env.DEEPSEEK_API_KEY,
        baseURL: "https://api.deepseek.com/anthropic",
    });
    const steps: { tool: string; input: unknown; output: string }[] = [];

    // Log: dicetak ke terminal `npm run dev` DAN dikirim ke UI
    const logs: string[] = [];
    const started = Date.now();
    const log = (line: string) => {
        const entry = `[+${Date.now() - started}ms] ${line}`;
        logs.push(entry);
        console.log(`[agent] ${entry}`);
    };
    const reply = (text: string) => {
        log(`DONE   total ${Date.now() - started}ms, ${steps.length} tool call(s)`);
        return Response.json({ reply: text, steps, logs });
    };

    const last = messages[messages.length - 1];
    log(`START  model=${MODEL}, ${messages.length} message(s) in history`);
    if (typeof last?.content === "string") log(`USER   "${last.content}"`);

    try {
        for (let i = 1; i <= MAX_TURNS; i++) {
            log(`TURN ${i} → panggil model...`);
            const t0 = Date.now();
            const res = await client.messages.create({
                model: MODEL, max_tokens: 1024, tools, messages,
            });
            log(`TURN ${i} ← ${Date.now() - t0}ms, stop_reason=${res.stop_reason}, ` +
                `tokens in=${res.usage.input_tokens} out=${res.usage.output_tokens}`);

            // Tampilkan isi tiap blok yang dikirim model
            for (const b of res.content) {
                if (b.type === "thinking") { if (b.thinking.trim()) log(`  THINK  ${b.thinking.slice(0, 200)}`); }
                else if (b.type === "text") log(`  TEXT   ${b.text.slice(0, 200)}`);
                else if (b.type === "tool_use") log(`  TOOL?  model minta ${b.name}(${JSON.stringify(b.input)})`);
                else log(`  BLOCK  ${b.type}`);
            }

            messages.push({ role: "assistant", content: res.content });

            if (res.stop_reason !== "tool_use") {
                const text = res.content.find((b) => b.type === "text");
                return reply(text?.type === "text" ? text.text : "");
            }
            // Semua tool di putaran ini dijalankan BERSAMAAN (paralel) dengan Promise.all
            const results = await Promise.all(res.content
                .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
                .map(async (b) => {
                    const tTool = Date.now();
                    const output = await runTool(b.name, b.input);
                    log(`  TOOL✓  ${b.name} (${Date.now() - tTool}ms) → ${output.slice(0, 300)}`);
                    steps.push({ tool: b.name, input: b.input, output });
                    return { type: "tool_result" as const, tool_use_id: b.id, content: output };
                }));
            messages.push({ role: "user", content: results });
        }
        log(`STOP   batas ${MAX_TURNS} putaran tercapai`);
        return reply("Berhenti: terlalu banyak langkah.");
    } catch (err) {
        log(`ERROR  ${(err as Error).message}`);
        return Response.json({ reply: `⚠ ${(err as Error).message}`, steps, logs }, { status: 500 });
    }
}