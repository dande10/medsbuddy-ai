//#region \0%23tanstack-start-server-fn-resolver
var manifest = { "752f65877434fcdd6e45f891c73843f5fd88857a1a68bc0b33a7fec45033e747": {
	functionName: "aiChat_createServerFn_handler",
	importer: () => import("./ai-chat.functions-D1dt8iCC.js")
} };
async function getServerFnById(id, access) {
	const serverFnInfo = manifest[id];
	if (!serverFnInfo) throw new Error("Server function info not found for " + id);
	const fnModule = serverFnInfo.module ?? await serverFnInfo.importer();
	if (!fnModule) throw new Error("Server function module not resolved for " + id);
	const action = fnModule[serverFnInfo.functionName];
	if (!action) throw new Error("Server function module export not resolved for serverFn ID: " + id);
	return action;
}
//#endregion
export { getServerFnById as t };
