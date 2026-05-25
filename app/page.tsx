"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bolt,
  Check,
  ChevronRight,
  Globe2,
  Layers,
  Lock,
  Sparkles,
  Workflow,
} from "lucide-react";

const logoRow = ["Frontier", "Kite", "Northline", "Pulse", "Fern", "Oasis", "Relay", "Copper"];

const stats = [
  { label: "Tasks auto-captured", value: "92%" },
  { label: "Avg time saved per week", value: "6.4 hrs" },
  { label: "Teams onboarded", value: "140+" },
];

const steps = [
  {
    title: "Connect your sources",
    body: "Link email, Slack, and meeting platforms with one secure OAuth flow.",
    icon: <Globe2 className="text-teal-500" size={18} />,
  },
  {
    title: "AI extracts real tasks",
    body: "TaskPulse detects deliverables, due dates, owners, and confidence levels in seconds.",
    icon: <Sparkles className="text-teal-500" size={18} />,
  },
  {
    title: "Confirm and ship",
    body: "Review tasks, assign owners, and push to your workflow with a single click.",
    icon: <Workflow className="text-teal-500" size={18} />,
  },
];

const features = [
  {
    title: "Signal-first inbox",
    body: "A focused task stream that filters out noise and highlights only actionable requests.",
    icon: <Bolt className="text-teal-500" size={18} />,
  },
  {
    title: "Confidence-aware reviews",
    body: "Human-in-the-loop approvals for high-impact changes and reassigned owners.",
    icon: <BadgeCheck className="text-teal-500" size={18} />,
  },
  {
    title: "Leadership visibility",
    body: "Weekly snapshots of client health, overdue risks, and delivery momentum.",
    icon: <BarChart3 className="text-teal-500" size={18} />,
  },
  {
    title: "Multi-client segmentation",
    body: "Organize tasks by client, engagement, or business unit without extra setup.",
    icon: <Layers className="text-teal-500" size={18} />,
  },
];

const showcaseCards = [
  {
    title: "Live task routing",
    body: "Auto-assign tasks to team leads based on client ownership and workload.",
  },
  {
    title: "Delivery confidence",
    body: "Spot at-risk deliverables before they slip with weekly AI summaries.",
  },
  {
    title: "Unified client memory",
    body: "Every task links back to the original context for instant accountability.",
  },
];

const integrations = ["Gmail", "Slack", "Google Meet", "Zoom", "Fathom", "Notion", "Linear"];

const faqs = [
  {
    q: "How long does setup take?",
    a: "Most teams are live in under 30 minutes with guided onboarding and templated workflows.",
  },
  {
    q: "Can we keep tasks private by client?",
    a: "Yes. TaskPulse supports per-client access controls and segmented reporting out of the box.",
  },
  {
    q: "Is the AI replaceable with manual review?",
    a: "Absolutely. You can toggle auto-approval off and require human confirmation for every task.",
  },
];

const plans = [
  {
    name: "Core",
    priceMonthly: 39,
    priceYearly: 32,
    tagline: "For lean teams getting started.",
    features: ["3 sources", "AI task extraction", "Client tagging", "Weekly digest"],
  },
  {
    name: "Studio",
    priceMonthly: 89,
    priceYearly: 72,
    tagline: "Best for growing agencies.",
    features: ["Unlimited sources", "Smart routing", "Team approvals", "Priority support"],
    highlighted: true,
  },
  {
    name: "Enterprise",
    priceMonthly: 189,
    priceYearly: 155,
    tagline: "Custom workflows and security.",
    features: ["SAML + SCIM", "Custom AI models", "Dedicated CSM", "Audit logs"],
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.6, ease: "easeOut" },
};

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  align?: "center" | "left";
}) {
  return (
    <div className={`flex flex-col gap-4 ${align === "center" ? "items-center text-center" : "items-start text-left"}`}>
      <span className="text-xs uppercase tracking-[0.2em] font-semibold text-teal-600 dark:text-teal-400">
        {eyebrow}
      </span>
      <h2 className="text-3xl md:text-4xl font-semibold text-slate-900 dark:text-slate-50 max-w-2xl">
        {title}
      </h2>
      <p className="text-base md:text-lg text-slate-600 dark:text-slate-300 max-w-2xl">
        {subtitle}
      </p>
    </div>
  );
}

export default function LandingPage() {
  const { status } = useSession();
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const isAuthed = status === "authenticated";

  const primaryCta = isAuthed
    ? { label: "Open dashboard", href: "/login" }
    : { label: "Get started", href: "/login" };
  const secondaryCta = isAuthed
    ? { label: "View product tour", href: "#showcase" }
    : { label: "View demo", href: "#showcase" };

  return (
    <main className="bg-[#f7f6f2] dark:bg-[#121316] text-slate-900 dark:text-slate-100">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(13,148,136,0.16),transparent_48%),radial-gradient(circle_at_70%_20%,rgba(251,191,36,0.12),transparent_42%)]" />
        <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(to_right,rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-[size:120px_120px]" />

        <header className="relative z-10">
          <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-semibold">
                TP
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold tracking-wide">TaskPulse</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">AI task orchestration</span>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
              <a href="#how-it-works" className="hover:text-slate-900 dark:hover:text-white">How it works</a>
              <a href="#features" className="hover:text-slate-900 dark:hover:text-white">Features</a>
              <a href="#showcase" className="hover:text-slate-900 dark:hover:text-white">Product</a>
              <a href="#pricing" className="hover:text-slate-900 dark:hover:text-white">Pricing</a>
              <a href="#faq" className="hover:text-slate-900 dark:hover:text-white">FAQ</a>
            </nav>
            <div className="flex items-center gap-3">
              {isAuthed ? (
                <Link
                  href="/login"
                  className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 px-3 py-2 rounded-lg border border-slate-200/80 dark:border-slate-700/80 hover:border-teal-500/60 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Dashboard
                  <ArrowRight size={16} />
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 px-3 py-2 rounded-lg border border-slate-200/80 dark:border-slate-700/80 hover:border-teal-500/60 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Login
                  <ArrowRight size={16} />
                </Link>
              )}
              <Link
                href="#pricing"
                className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 px-4 py-2 rounded-lg shadow-sm"
              >
                See pricing
              </Link>
            </div>
          </div>
        </header>

        <section className="relative z-10 max-w-6xl mx-auto px-6 pt-10 pb-24 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          <motion.div {...fadeUp} className="flex flex-col gap-6">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-teal-700 dark:text-teal-300 bg-teal-100/80 dark:bg-teal-500/10 px-3 py-1 rounded-full w-fit">
              <Sparkles size={14} />
              Built for agency teams
            </span>
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight text-slate-950 dark:text-white">
              Capture every client request and turn it into a tracked deliverable.
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-xl">
              TaskPulse unifies chats, emails, and meeting notes into a single task layer. No more missed asks, no more manual summaries.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {"href" in primaryCta ? (
                <Link
                  href={primaryCta.href}
                  className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-sm"
                >
                  {primaryCta.label}
                  <ArrowRight size={16} />
                </Link>
              ) : (
                <button
                  onClick={primaryCta.action}
                  className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-sm"
                >
                  {primaryCta.label}
                  <ArrowRight size={16} />
                </button>
              )}
              <Link
                href={secondaryCta.href}
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 px-5 py-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 hover:border-teal-500/60 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                {secondaryCta.label}
                <ChevronRight size={16} />
              </Link>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-2"><Lock size={14} /> SOC2-ready security</span>
              <span className="inline-flex items-center gap-2"><BadgeCheck size={14} /> Human-in-the-loop approvals</span>
            </div>
          </motion.div>

          {/* Right Side Illustration */}
          <motion.div {...fadeUp} className="relative">
            <div className="absolute -top-10 -right-8 w-32 h-32 rounded-full bg-teal-500/20 blur-3xl" />
            <div className="absolute -bottom-12 left-6 w-40 h-40 rounded-full bg-amber-400/20 blur-3xl" />
            <div className="relative bg-white/90 dark:bg-[#1a1c20]/90 border border-slate-200/70 dark:border-slate-700/60 rounded-3xl shadow-[0_30px_90px_rgba(15,23,42,0.18)] p-6 backdrop-blur">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Live Workspace</p>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Campaign Ops Overview</h3>
                </div>
                <span className="text-xs font-semibold text-teal-600 bg-teal-100/70 dark:bg-teal-500/10 px-2 py-1 rounded-full">AI synced</span>
              </div>
              <div className="bg-slate-50 dark:bg-[#14161a] border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">Client signal</p>
                <div className="mt-4 space-y-3">
                  {[
                    { name: "Zomato", value: "On track" },
                    { name: "Flipkart", value: "Needs review" },
                    { name: "Amazon", value: "On track" },
                  ].map((row) => (
                    <div key={row.name} className="flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-200">
                      <span>{row.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-700/60 text-slate-600 dark:text-slate-200">
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-6 bg-slate-50 dark:bg-[#14161a] border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Today&apos;s extracted tasks</p>
                  <span className="text-xs font-semibold text-teal-600">+18</span>
                </div>
                <div className="space-y-2 text-sm">
                  {[
                    "Send revised creatives to Flipkart",
                    "Share May invoice with Zomato",
                    "Finalize Google campaign brief",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-6 bg-white dark:bg-[#1b1d22] border border-slate-200/70 dark:border-slate-700/60 rounded-2xl shadow-lg p-4 w-48 animate-float-slow">
              <p className="text-xs text-slate-500 dark:text-slate-400">AI summary</p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-2">
                6 deliverables need review before Friday.
              </p>
            </div>
          </motion.div>
        </section>
      </div>

      {/* Trust / Social Proof Section */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex flex-col gap-10">
          <div className="flex flex-wrap items-center gap-6 justify-between">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Trusted by agency operators</p>
            <div className="flex flex-wrap gap-4 text-sm text-slate-500">
              {logoRow.map((logo) => (
                <span key={logo} className="px-3 py-1 rounded-full border border-slate-200/70 dark:border-slate-700/60 bg-white/80 dark:bg-[#15171b]">
                  {logo}
                </span>
              ))}
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-white dark:bg-[#15171b] border border-slate-200/70 dark:border-slate-700/60 rounded-2xl p-6">
                <p className="text-3xl font-semibold text-slate-900 dark:text-white">{stat.value}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-20">
        <SectionHeader
          eyebrow="How it works"
          title="The workflow your team already has, now with AI clarity."
          subtitle="Connect your existing channels and let TaskPulse translate conversation into delivery-ready tasks."
        />
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              {...fadeUp}
              className="bg-white dark:bg-[#15171b] border border-slate-200/70 dark:border-slate-700/60 rounded-2xl p-6 flex flex-col gap-4"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-teal-100/70 dark:bg-teal-500/10 flex items-center justify-center">
                  {step.icon}
                </div>
                <span className="text-xs font-semibold text-slate-400">0{index + 1}</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{step.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">{step.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-12 items-start">
          <div className="flex flex-col gap-6">
            <SectionHeader
              align="left"
              eyebrow="Capabilities"
              title="Built for real agency operations, not just task lists."
              subtitle="Every feature is designed to reduce follow-up work and keep the team aligned on client delivery."
            />
            <div className="grid gap-4">
              {features.map((feature) => (
                <div key={feature.title} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-teal-100/70 dark:bg-teal-500/10 flex items-center justify-center">
                    {feature.icon}
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-slate-900 dark:text-white">{feature.title}</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{feature.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <motion.div {...fadeUp} className="bg-white dark:bg-[#15171b] border border-slate-200/70 dark:border-slate-700/60 rounded-3xl p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Workflow view</p>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">TaskPulse Board</h3>
              </div>
              <span className="text-xs text-teal-600 font-semibold">Updated just now</span>
            </div>
            <div className="mt-6 grid sm:grid-cols-2 gap-4">
              {[
                { title: "Incoming", count: "24", tone: "bg-teal-500/10 text-teal-600" },
                { title: "In progress", count: "13", tone: "bg-amber-400/15 text-amber-700" },
                { title: "Review", count: "7", tone: "bg-slate-200/60 text-slate-600" },
                { title: "Complete", count: "46", tone: "bg-slate-200/60 text-slate-600" },
              ].map((col) => (
                <div key={col.title} className="bg-slate-50 dark:bg-[#14161a] border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{col.title}</p>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${col.tone}`}>{col.count}</span>
                  </div>
                  <div className="mt-4 space-y-2">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <div key={idx} className="h-2 rounded-full bg-slate-200/80 dark:bg-slate-700/60" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Showcase Section */}
      <section id="showcase" className="max-w-6xl mx-auto px-6 py-20">
        <SectionHeader
          eyebrow="Product showcase"
          title="Layered visibility for every role."
          subtitle="From client leads to project owners, everyone sees what matters most without extra meetings."
        />
        <div className="mt-12 grid lg:grid-cols-[1.1fr_0.9fr] gap-8 items-start">
          <motion.div {...fadeUp} className="bg-white dark:bg-[#15171b] border border-slate-200/70 dark:border-slate-700/60 rounded-3xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Portfolio health</h3>
              <span className="text-xs font-semibold text-teal-600">Weekly pulse</span>
            </div>
            <div className="space-y-4">
              {[
                { name: "Amazon", score: "92", trend: "+4" },
                { name: "Google", score: "86", trend: "+1" },
                { name: "Zomato", score: "78", trend: "-2" },
              ].map((row) => (
                <div key={row.name} className="flex items-center justify-between bg-slate-50 dark:bg-[#14161a] border border-slate-200/60 dark:border-slate-700/60 rounded-2xl px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{row.name}</p>
                    <p className="text-xs text-slate-500">Delivery score</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">{row.score}</p>
                    <p className="text-xs text-teal-600">{row.trend} pts</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-[#14161a] border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-4">
                <p className="text-xs text-slate-500">Overdue risks</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-white mt-2">8</p>
              </div>
              <div className="bg-slate-50 dark:bg-[#14161a] border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-4">
                <p className="text-xs text-slate-500">Auto-approved</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-white mt-2">64</p>
              </div>
            </div>
          </motion.div>
          <div className="space-y-4">
            {showcaseCards.map((card) => (
              <motion.div
                key={card.title}
                {...fadeUp}
                className="bg-white dark:bg-[#15171b] border border-slate-200/70 dark:border-slate-700/60 rounded-2xl p-6"
              >
                <h4 className="text-base font-semibold text-slate-900 dark:text-white">{card.title}</h4>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{card.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-20">
        <SectionHeader
          eyebrow="Pricing"
          title="Transparent plans that scale with delivery volume."
          subtitle="Switch between monthly and annual billing with straightforward savings."
        />
        <div className="flex items-center justify-center mt-10">
          <div className="bg-white dark:bg-[#15171b] border border-slate-200/70 dark:border-slate-700/60 rounded-full p-1 flex items-center gap-1 text-sm font-semibold">
            {(["monthly", "yearly"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setBilling(mode)}
                className={`px-4 py-2 rounded-full transition-colors ${
                  billing === mode
                    ? "bg-teal-600 text-white"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {mode === "monthly" ? "Monthly" : "Yearly"}
              </button>
            ))}
          </div>
        </div>
        <div className="grid lg:grid-cols-3 gap-6 mt-10">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-3xl p-6 border ${
                plan.highlighted
                  ? "bg-teal-600 text-white border-teal-600 shadow-[0_25px_70px_rgba(13,148,136,0.25)]"
                  : "bg-white dark:bg-[#15171b] border-slate-200/70 dark:border-slate-700/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-semibold ${plan.highlighted ? "text-white" : "text-slate-900 dark:text-white"}`}>
                  {plan.name}
                </h3>
                {plan.highlighted && (
                  <span className="text-xs font-semibold bg-white/15 px-2 py-1 rounded-full">Recommended</span>
                )}
              </div>
              <p className={`text-sm mt-2 ${plan.highlighted ? "text-teal-50" : "text-slate-500 dark:text-slate-300"}`}>
                {plan.tagline}
              </p>
              <div className="mt-6 flex items-end gap-2">
                <span className={`text-4xl font-semibold ${plan.highlighted ? "text-white" : "text-slate-900 dark:text-white"}`}>
                  ${billing === "monthly" ? plan.priceMonthly : plan.priceYearly}
                </span>
                <span className={`text-sm ${plan.highlighted ? "text-teal-50" : "text-slate-500 dark:text-slate-300"}`}>
                  / seat
                </span>
              </div>
              <ul className={`mt-6 space-y-2 text-sm ${plan.highlighted ? "text-teal-50" : "text-slate-600 dark:text-slate-300"}`}>
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check size={16} className={plan.highlighted ? "text-teal-50" : "text-teal-600"} />
                    {feature}
                  </li>
                ))}
              </ul>
              {plan.highlighted ? (
                isAuthed ? (
                  <Link
                    href="/login"
                    className="mt-6 inline-flex items-center justify-center w-full gap-2 bg-white text-teal-700 font-semibold px-4 py-3 rounded-xl"
                  >
                    Open dashboard
                    <ArrowRight size={16} />
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    className="mt-6 inline-flex items-center justify-center w-full gap-2 bg-white text-teal-700 font-semibold px-4 py-3 rounded-xl"
                  >
                    Start now
                    <ArrowRight size={16} />
                  </Link>
                )
              ) : isAuthed ? (
                <Link
                  href="/login"
                  className="mt-6 inline-flex items-center justify-center w-full gap-2 border border-slate-200/80 dark:border-slate-700/70 text-slate-700 dark:text-slate-200 font-semibold px-4 py-3 rounded-xl"
                >
                  Open dashboard
                  <ArrowRight size={16} />
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="mt-6 inline-flex items-center justify-center w-full gap-2 border border-slate-200/80 dark:border-slate-700/70 text-slate-700 dark:text-slate-200 font-semibold px-4 py-3 rounded-xl"
                >
                  Start now
                  <ArrowRight size={16} />
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Integrations Section */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-start">
          <SectionHeader
            align="left"
            eyebrow="Integrations"
            title="Works with the tools your team already trusts."
            subtitle="Enable TaskPulse to listen across communication and project platforms without switching tabs."
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {integrations.map((item) => (
              <div key={item} className="bg-white dark:bg-[#15171b] border border-slate-200/70 dark:border-slate-700/60 rounded-xl px-3 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200 text-center">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="max-w-6xl mx-auto px-6 py-20">
        <SectionHeader
          eyebrow="FAQ"
          title="Answers before you need them."
          subtitle="Everything you need to know about TaskPulse operations, security, and onboarding."
        />
        <div className="grid md:grid-cols-2 gap-6 mt-10">
          {faqs.map((faq) => (
            <div key={faq.q} className="bg-white dark:bg-[#15171b] border border-slate-200/70 dark:border-slate-700/60 rounded-2xl p-6">
              <h4 className="text-base font-semibold text-slate-900 dark:text-white">{faq.q}</h4>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="bg-teal-600 text-white rounded-3xl p-10 md:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-teal-100">Ready to launch</p>
            <h3 className="text-2xl md:text-3xl font-semibold mt-3">Let your team focus on delivery, not decoding messages.</h3>
            <p className="text-sm text-teal-100 mt-2 max-w-xl">
              Turn every client communication into a tracked deliverable with TaskPulse AI.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {isAuthed ? (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-white text-teal-700 font-semibold px-5 py-3 rounded-xl"
              >
                Open dashboard
                <ArrowRight size={16} />
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-white text-teal-700 font-semibold px-5 py-3 rounded-xl"
              >
                Get started
                <ArrowRight size={16} />
              </Link>
            )}
            <Link
              href="#showcase"
              className="inline-flex items-center gap-2 border border-white/40 text-white font-semibold px-5 py-3 rounded-xl"
            >
              View product
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/70 dark:border-slate-700/60">
        <div className="max-w-6xl mx-auto px-6 py-10 grid md:grid-cols-[1.2fr_1fr_1fr_1fr] gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-semibold">TP</div>
              <div>
                <p className="text-sm font-semibold">TaskPulse</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">AI task orchestration</p>
              </div>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
              A modern operations layer that keeps client delivery organized and accountable.
            </p>
          </div>
          <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <p className="font-semibold text-slate-900 dark:text-white">Product</p>
            <a href="#features" className="block hover:text-slate-900 dark:hover:text-white">Features</a>
            <a href="#showcase" className="block hover:text-slate-900 dark:hover:text-white">Showcase</a>
            <a href="#pricing" className="block hover:text-slate-900 dark:hover:text-white">Pricing</a>
          </div>
          <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <p className="font-semibold text-slate-900 dark:text-white">Company</p>
            <a href="#" className="block hover:text-slate-900 dark:hover:text-white">About</a>
            <a href="#" className="block hover:text-slate-900 dark:hover:text-white">Careers</a>
            <a href="#" className="block hover:text-slate-900 dark:hover:text-white">Contact</a>
          </div>
          <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <p className="font-semibold text-slate-900 dark:text-white">Security</p>
            <a href="#" className="block hover:text-slate-900 dark:hover:text-white">Compliance</a>
            <a href="#" className="block hover:text-slate-900 dark:hover:text-white">Privacy</a>
            <a href="#" className="block hover:text-slate-900 dark:hover:text-white">Status</a>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 pb-8 text-xs text-slate-400 flex flex-col md:flex-row items-center justify-between gap-3">
          <span>Copyright 2026 TaskPulse. All rights reserved.</span>
          <span className="inline-flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-500" />
            Built with secure AI workflows.
          </span>
        </div>
      </footer>
    </main>
  );
}