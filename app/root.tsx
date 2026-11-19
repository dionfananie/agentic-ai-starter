import {
	isRouteErrorResponse,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import {
	Button,
	Card,
	EmptyState,
	Text,
	ThemeProvider,
	tokens,
	usePal,
} from "../src/halaska-kit";

const THEME = "dark" as const;

export const links: Route.LinksFunction = () => [
	{ rel: "preconnect", href: "https://fonts.googleapis.com" },
	{
		rel: "preconnect",
		href: "https://fonts.gstatic.com",
		crossOrigin: "anonymous",
	},
	{
		rel: "stylesheet",
		href: "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap",
	},
];

export function Layout({ children }: { children: React.ReactNode }) {
	return (
		<html
			lang="en"
			style={{ background: tokens.dark.bg, colorScheme: THEME }}
		>
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<meta name="theme-color" content={tokens.dark.bg} />
				<Meta />
				<Links />
			</head>
			<body style={{ background: tokens.dark.bg }}>
				{children}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

function AppShell() {
	const pal = usePal();

	return (
		<div
			style={{
				minHeight: "100vh",
				background: pal.bg,
				color: pal.text,
				fontFamily: tokens.font.sans,
			}}
		>
			<Outlet />
		</div>
	);
}

export default function App() {
	return (
		<ThemeProvider theme={THEME}>
			<AppShell />
		</ThemeProvider>
	);
}

function ErrorScreen({
	message,
	details,
	stack,
}: {
	message: string;
	details: string;
	stack?: string;
}) {
	const pal = usePal();

	return (
		<main
			style={{
				minHeight: "100vh",
				padding: "clamp(24px, 6vw, 64px)",
				background: pal.bg,
				color: pal.text,
				fontFamily: tokens.font.sans,
			}}
		>
			<div style={{ maxWidth: 720, margin: "0 auto" }}>
				<Card>
					<EmptyState
						icon={<span style={{ color: pal.danger }}>⚠</span>}
						title={message}
						description={details}
						action={
							<Button onClick={() => window.location.reload()}>
								Reload
							</Button>
						}
					/>
					{stack && (
						<>
							<Text
								size="xs"
								weight="medium"
								secondary
								style={{
									display: "block",
									marginBottom: tokens.space.sm,
									textTransform: "uppercase",
									letterSpacing: "0.08em",
								}}
							>
								Stack trace
							</Text>
							<pre
								style={{
									margin: 0,
									padding: tokens.space.md,
									background: pal.bgSubtle,
									color: pal.textSecondary,
									borderRadius: tokens.radius.sm,
									overflowX: "auto",
									fontFamily: tokens.font.mono,
									fontSize: tokens.type.sm.fontSize,
									lineHeight: tokens.type.sm.lineHeight,
								}}
							>
								{stack}
							</pre>
						</>
					)}
				</Card>
			</div>
		</main>
	);
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	let message = "Oops!";
	let details = "An unexpected error occurred.";
	let stack: string | undefined;

	if (isRouteErrorResponse(error)) {
		message = error.status === 404 ? "404" : "Error";
		details =
			error.status === 404
				? "The requested page could not be found."
				: error.statusText || details;
	} else if (import.meta.env.DEV && error && error instanceof Error) {
		details = error.message;
		stack = error.stack;
	}

	return (
		<ThemeProvider theme={THEME}>
			<ErrorScreen message={message} details={details} stack={stack} />
		</ThemeProvider>
	);
}
