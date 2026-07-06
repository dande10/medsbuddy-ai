import { jsx, jsxs } from "react/jsx-runtime";
import { motion } from "framer-motion";
//#region src/components/ai-orb.tsx
/** Premium animated AI avatar — conic gradient orb that reacts to state. */
function AiOrb({ size = 96, speaking, listening, thinking }) {
	const scale = speaking ? [
		1,
		1.07,
		1
	] : listening ? [
		1,
		1.03,
		1
	] : 1;
	const duration = speaking ? 1.1 : listening ? 1.8 : 4;
	return /* @__PURE__ */ jsxs("div", {
		className: "relative grid place-items-center",
		style: {
			width: size,
			height: size
		},
		children: [
			/* @__PURE__ */ jsx("div", {
				className: "absolute inset-0 rounded-full blur-2xl opacity-60",
				style: { background: "radial-gradient(circle, oklch(0.68 0.20 262 / 0.55), transparent 70%)" }
			}),
			/* @__PURE__ */ jsxs(motion.div, {
				className: "ai-orb rounded-full relative overflow-hidden",
				style: {
					width: size * .92,
					height: size * .92
				},
				animate: { scale },
				transition: {
					duration,
					repeat: Infinity,
					ease: "easeInOut"
				},
				children: [/* @__PURE__ */ jsx("div", { className: "ai-halo absolute inset-0 rounded-full" }), /* @__PURE__ */ jsx("div", {
					className: "absolute rounded-full bg-background/30 backdrop-blur-md",
					style: { inset: size * .18 }
				})]
			}),
			thinking && /* @__PURE__ */ jsxs("div", {
				className: "absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-1",
				children: [
					/* @__PURE__ */ jsx("span", { className: "size-1.5 rounded-full bg-primary typing-dot" }),
					/* @__PURE__ */ jsx("span", {
						className: "size-1.5 rounded-full bg-primary typing-dot",
						style: { animationDelay: "0.15s" }
					}),
					/* @__PURE__ */ jsx("span", {
						className: "size-1.5 rounded-full bg-primary typing-dot",
						style: { animationDelay: "0.3s" }
					})
				]
			})
		]
	});
}
//#endregion
export { AiOrb as t };
