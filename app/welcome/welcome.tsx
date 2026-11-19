import type { CSSProperties } from "react";
import logoDark from "./logo-dark.svg";
import {
	AlertBanner,
	Badge,
	Button,
	Caption,
	Card,
	CardHeader,
	Code,
	Heading,
	ListItem,
	Orb,
	Snippet,
	Stack,
	StatusBadge,
	Tag,
	Text,
	rad,
	tokens,
	usePal,
} from "../../src/halaska-kit";

const DOCS_URL = "https://reactrouter.com/docs";
const DISCORD_URL = "https://rmx.as/discord";

const resources = [
	{
		href: DOCS_URL,
		text: "React Router Docs",
		description: "Routing, loaders, actions, and rendering.",
		icon: <DocsIcon />,
	},
	{
		href: DISCORD_URL,
		text: "Join Discord",
		description: "Ask questions and meet the community.",
		icon: <DiscordIcon />,
	},
];

const features = [
	{
		title: "Server-side rendering",
		description:
			"Loaders run on the server, so data is ready before the first paint.",
		orb: "globe",
	},
	{
		title: "Edge-ready",
		description:
			"Deploy to Cloudflare Workers with a single command when you are ready.",
		orb: "orbit",
	},
	{
		title: "One UI system",
		description:
			"Every surface here uses Halaska UI components, tokens, and patterns.",
		orb: "spark",
	},
] as const;

export function Welcome({ message }: { message: string }) {
	const pal = usePal();
	const iconTile: CSSProperties = {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		width: 34,
		height: 34,
		flexShrink: 0,
		borderRadius: rad.sm,
		background: pal.bgMuted,
		color: pal.textSecondary,
	};

	return (
		<main
			style={{
				position: "relative",
				minHeight: "100vh",
				padding: "clamp(20px, 4vw, 40px) clamp(20px, 5vw, 56px) 48px",
				overflow: "hidden",
			}}
		>
			<div
				aria-hidden="true"
				style={{
					position: "absolute",
					inset: "0 0 auto",
					height: 520,
					background: `radial-gradient(700px 360px at 12% 0%, ${pal.accentBg}, transparent 70%)`,
					pointerEvents: "none",
				}}
			/>

			<div
				style={{
					position: "relative",
					maxWidth: 1120,
					margin: "0 auto",
				}}
			>
				<header
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: tokens.space.md,
						flexWrap: "wrap",
					}}
				>
					<Stack direction="row" align="center" gap="md" wrap>
						<Stack direction="row" align="center" gap="sm">
							<span
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									width: 36,
									height: 36,
									borderRadius: rad.sm,
									background: pal.bgSubtle,
									border: `1px solid ${pal.borderSubtle}`,
								}}
							>
								<Orb
									variant="orbit"
									size={20}
									color={pal.accent}
									label="Agent ready"
								/>
							</span>
							<img
								src={logoDark}
								alt="React Router"
								style={{ height: 20, width: "auto", display: "block" }}
							/>
						</Stack>
						<Badge variant="accent">Agentic AI</Badge>
					</Stack>

					<Stack direction="row" align="center" gap="sm" wrap>
						<Tag>Halaska UI</Tag>
						<StatusBadge status="online" pulse>
							Workers · live
						</StatusBadge>
					</Stack>
				</header>

				<section
					style={{
						display: "grid",
						gridTemplateColumns:
							"repeat(auto-fit, minmax(min(100%, 420px), 1fr))",
						gap: "clamp(24px, 4vw, 56px)",
						alignItems: "start",
						marginTop: "clamp(48px, 8vw, 96px)",
					}}
				>
					<Stack gap={20} align="flex-start">
						<Stack direction="row" align="center" gap="sm">
							<Orb variant="pulse" size={18} color={pal.accent} />
							<Caption>Your starter is running</Caption>
						</Stack>

						<Heading
							level={1}
							style={{
								maxWidth: 620,
								fontSize: "clamp(40px, 6vw, 64px)",
								lineHeight: 1.05,
								letterSpacing: "-0.03em",
							}}
						>
							What&apos;s next?
						</Heading>

						<Text
							size="lg"
							secondary
							style={{ maxWidth: 560, lineHeight: 1.6 }}
						>
							This React Router app is live on Cloudflare Workers, with every
							screen built on Halaska UI. Pick a direction and start shaping it.
						</Text>

						<div style={{ width: "100%", maxWidth: 560 }}>
							<AlertBanner
								title="From your Worker"
								description={message}
								variant="success"
							/>
						</div>

						<Stack direction="row" gap="sm" wrap>
							<Button
								size="lg"
								onClick={() => openExternal(DOCS_URL)}
								iconRight={<ArrowIcon />}
							>
								Read the docs
							</Button>
							<Button
								size="lg"
								variant="outline"
								onClick={() => openExternal(DISCORD_URL)}
								icon={<DiscordIcon />}
							>
								Join Discord
							</Button>
						</Stack>

						<Caption>
							This screen lives in <Code>app/welcome/welcome.tsx</Code>.
						</Caption>
					</Stack>

					<Card padding={0} style={{ overflow: "hidden" }}>
						<div style={{ padding: "clamp(20px, 3vw, 28px)" }}>
							<CardHeader
								title="Start here"
								subtitle="Docs, community, and the dev server."
								action={<Badge variant="success">Ready</Badge>}
							/>

							<Stack gap={0}>
								{resources.map((resource, index) => (
									<a
										key={resource.href}
										href={resource.href}
										target="_blank"
										rel="noreferrer"
										style={{
											display: "block",
											color: "inherit",
											textDecoration: "none",
											borderRadius: rad.sm,
											outlineOffset: 2,
										}}
									>
										<ListItem
											left={<span style={iconTile}>{resource.icon}</span>}
											title={resource.text}
											subtitle={resource.description}
											right={
												<span
													aria-hidden="true"
													style={{ color: pal.textTertiary, fontSize: 14 }}
												>
													↗
												</span>
											}
											divider={index < resources.length - 1}
										/>
									</a>
								))}
							</Stack>
						</div>

						<div
							style={{
								padding: "20px clamp(20px, 3vw, 28px)",
								background: pal.bgSubtle,
								borderTop: `1px solid ${pal.borderSubtle}`,
							}}
						>
							<Stack gap="sm">
								<Caption>Run it locally</Caption>
								<Snippet text="npm run dev" />
							</Stack>
						</div>
					</Card>
				</section>

				<section
					style={{
						display: "grid",
						gridTemplateColumns:
							"repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
						gap: tokens.space.md,
						marginTop: "clamp(32px, 5vw, 56px)",
					}}
				>
					{features.map((feature) => (
						<FeatureCard key={feature.title} {...feature} />
					))}
				</section>

				<footer
					style={{
						marginTop: "clamp(32px, 5vw, 56px)",
						paddingTop: tokens.space.lg,
						borderTop: `1px solid ${pal.borderSubtle}`,
					}}
				>
					<Stack
						direction="row"
						justify="space-between"
						align="center"
						gap="md"
						wrap
					>
						<Caption>
							Built with React Router, Cloudflare Workers, and Halaska UI.
						</Caption>
						<Stack direction="row" align="center" gap="sm">
							<Tag>SSR</Tag>
							<Tag>Edge</Tag>
							<Tag>TypeScript</Tag>
						</Stack>
					</Stack>
				</footer>
			</div>
		</main>
	);
}

function FeatureCard({
	title,
	description,
	orb,
}: {
	title: string;
	description: string;
	orb: "globe" | "orbit" | "spark";
}) {
	const pal = usePal();

	return (
		<Card hover>
			<Stack gap="sm">
				<span
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						width: 32,
						height: 32,
						borderRadius: rad.sm,
						background: pal.accentBg,
					}}
				>
					<Orb variant={orb} size={18} color={pal.accent} />
				</span>
				<Heading level={4}>{title}</Heading>
				<Caption style={{ lineHeight: 1.6 }}>{description}</Caption>
			</Stack>
		</Card>
	);
}

function openExternal(href: string) {
	window.open(href, "_blank", "noopener,noreferrer");
}

function ArrowIcon() {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M4 12 12 4M6 4h6v6" />
		</svg>
	);
}

function DocsIcon() {
	return (
		<svg
			width="17"
			height="17"
			viewBox="0 0 20 20"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			aria-hidden="true"
		>
			<path d="M9.99981 10.0751V9.99992M17.4688 17.4688C15.889 19.0485 11.2645 16.9853 7.13958 12.8604C3.01467 8.73546 0.951405 4.11091 2.53116 2.53116C4.11091 0.951405 8.73546 3.01467 12.8604 7.13958C16.9853 11.2645 19.0485 15.889 17.4688 17.4688ZM2.53132 17.4688C0.951566 15.8891 3.01483 11.2645 7.13974 7.13963C11.2647 3.01471 15.8892 0.951453 17.469 2.53121C19.0487 4.11096 16.9854 8.73551 12.8605 12.8604C8.73562 16.9853 4.11107 19.0486 2.53132 17.4688Z" />
		</svg>
	);
}

function DiscordIcon() {
	return (
		<svg
			width="17"
			height="15"
			viewBox="0 0 24 20"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			aria-hidden="true"
		>
			<path d="M15.0686 1.25995L14.5477 1.17423L14.2913 1.63578C14.1754 1.84439 14.0545 2.08275 13.9422 2.31963C12.6461 2.16488 11.3406 2.16505 10.0445 2.32014C9.92822 2.08178 9.80478 1.84975 9.67412 1.62413L9.41449 1.17584L8.90333 1.25995C7.33547 1.51794 5.80717 1.99419 4.37748 2.66939L4.19 2.75793L4.07461 2.93019C1.23864 7.16437 0.46302 11.3053 0.838165 15.3924L0.868838 15.7266L1.13844 15.9264C2.81818 17.1714 4.68053 18.1233 6.68582 18.719L7.18892 18.8684L7.50166 18.4469C7.96179 17.8268 8.36504 17.1824 8.709 16.4944L8.71099 16.4904C10.8645 17.0471 13.128 17.0485 15.2821 16.4947C15.6261 17.1826 16.0293 17.8269 16.4892 18.4469L16.805 18.8725L17.3116 18.717C19.3056 18.105 21.1876 17.1751 22.8559 15.9238L23.1224 15.724L23.1528 15.3923C23.5873 10.6524 22.3579 6.53306 19.8947 2.90714L19.7759 2.73227L19.5833 2.64518C18.1437 1.99439 16.6386 1.51826 15.0686 1.25995ZM16.6074 10.7755L16.6074 10.7756C16.5934 11.6409 16.0212 12.1444 15.4783 12.1444C14.9297 12.1444 14.3493 11.6173 14.3493 10.7877C14.3493 9.94885 14.9378 9.41192 15.4783 9.41192C16.0471 9.41192 16.6209 9.93851 16.6074 10.7755ZM8.49373 12.1444C7.94513 12.1444 7.36471 11.6173 7.36471 10.7877C7.36471 9.94885 7.95323 9.41192 8.49373 9.41192C9.06038 9.41192 9.63892 9.93712 9.6417 10.7815C9.62517 11.6239 9.05462 12.1444 8.49373 12.1444Z" />
		</svg>
	);
}
