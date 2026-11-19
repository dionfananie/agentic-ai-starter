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
    run: (input: any) => string;
};

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
};

// Daftar skema yang dikirim ke model
const tools: Anthropic.Tool[] = Object.values(TOOLS).map((t) => t.schema);

function runTool(name: string, input: any): string {
    const tool = TOOLS[name];
    if (!tool) return `Error: tool tidak dikenal: ${name}`;
    try {
        return tool.run(input);
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
            const results = res.content
                .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
                .map((b) => {
                    const output = runTool(b.name, b.input);
                    log(`  TOOL✓  ${b.name} → ${output}`);
                    steps.push({ tool: b.name, input: b.input, output });
                    return { type: "tool_result" as const, tool_use_id: b.id, content: output };
                });
            messages.push({ role: "user", content: results });
        }
        log(`STOP   batas ${MAX_TURNS} putaran tercapai`);
        return reply("Berhenti: terlalu banyak langkah.");
    } catch (err) {
        log(`ERROR  ${(err as Error).message}`);
        return Response.json({ reply: `⚠ ${(err as Error).message}`, steps, logs }, { status: 500 });
    }
}