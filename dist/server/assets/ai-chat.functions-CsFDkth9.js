import { t as getServerFnById } from "./__23tanstack-start-server-fn-resolver-C_9a0C7C.js";
import { i as createServerFn, p as TSS_SERVER_FUNCTION } from "./esm-Dova13aH.js";
//#region node_modules/@tanstack/start-server-core/dist/esm/createSsrRpc.js
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
//#endregion
//#region src/lib/ai-chat.functions.ts
function validate(input) {
	if (!input || typeof input !== "object") throw new Error("Invalid input");
	const i = input;
	if (!Array.isArray(i.messages)) throw new Error("messages required");
	return i;
}
var aiChat = createServerFn({ method: "POST" }).inputValidator(validate).handler(createSsrRpc("752f65877434fcdd6e45f891c73843f5fd88857a1a68bc0b33a7fec45033e747"));
//#endregion
export { aiChat as t };
