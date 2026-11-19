import { useEffect, useRef, useState } from "react";
import type { Route } from "./+types/chat";
import {
	ChatInput,
	Message,
	ThinkingIndicator,
	ThinkingSteps,
	tokens,
	usePal,
} from "../../src/halaska-kit";

type Step = { tool: string; input: unknown; output: string };
type ChatMsg = {
	role: "user" | "assistant";
	content: string;
	steps?: Step[];
	logs?: string[];
};

export function meta({}: Route.MetaArgs) {
	return [{ title: "Agent Chat" }];
}

export default function Chat() {
	const pal = usePal();
	const [messages, setMessages] = useState<ChatMsg[]>([]);
	const [loading, setLoading] = useState(false);
	const bottomRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, loading]);

	async function send(text: string) {
		if (!text || loading) return;
		const next: ChatMsg[] = [...messages, { role: "user", content: text }];
		setMessages(next);
		setLoading(true);
		try {
			const res = await fetch("/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				// Kirim seluruh riwayat (hanya teks) → ini "memori" agent
				body: JSON.stringify({
					messages: next.map(({ role, content }) => ({ role, content })),
				}),
			});
			const data = (await res.json().catch(() => null)) as {
				reply: string;
				steps: Step[];
				logs: string[];
			} | null;
			if (!data) throw new Error(`Server error ${res.status}`);
			setMessages([
				...next,
				{ role: "assistant", content: data.reply, steps: data.steps, logs: data.logs },
			]);
		} catch (err) {
			setMessages([
				...next,
				{ role: "assistant", content: `⚠ ${(err as Error).message}` },
			]);
		} finally {
			setLoading(false);
		}
	}

	return (
		<main
			style={{
				maxWidth: 760,
				margin: "0 auto",
				padding: 24,
				minHeight: "100vh",
				display: "flex",
				flexDirection: "column",
				gap: 16,
			}}
		>
			<h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Agent Chat</h1>

			<div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
				{messages.length === 0 && (
					<p style={{ color: pal.textSecondary, margin: 0 }}>
						Coba: "Berapa 98765 * 4321?" lalu "dibagi 5 berapa?"
					</p>
				)}

				{messages.map((m, i) => (
					<div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
						{m.steps && m.steps.length > 0 && (
							<ThinkingSteps
								steps={m.steps.map(
									(s) => `🔧 ${s.tool}(${JSON.stringify(s.input)}) → ${s.output}`,
								)}
								current={m.steps.length}
							/>
						)}

						<Message role={m.role === "user" ? "user" : "agent"} text={m.content} />

						{m.logs && m.logs.length > 0 && (
							<details>
								<summary
									style={{ cursor: "pointer", fontSize: 12, color: pal.textTertiary }}
								>
									Log ({m.logs.length} baris)
								</summary>
								<pre
									style={{
										margin: "8px 0 0",
										padding: 12,
										background: pal.bgSubtle,
										color: pal.textSecondary,
										borderRadius: 8,
										overflowX: "auto",
										fontFamily: tokens.font.mono,
										fontSize: 12,
										lineHeight: 1.5,
										whiteSpace: "pre-wrap",
									}}
								>
									{m.logs.join("\n")}
								</pre>
							</details>
						)}
					</div>
				))}

				{loading && <ThinkingIndicator label="Agent sedang berpikir" />}
				<div ref={bottomRef} />
			</div>

			<div style={{ position: "sticky", bottom: 16 }}>
				<ChatInput
					onSubmit={send}
					disabled={loading}
					suggestions={[]}
					models={[]}
					placeholder="Tanya agent…"
				/>
			</div>
		</main>
	);
}
