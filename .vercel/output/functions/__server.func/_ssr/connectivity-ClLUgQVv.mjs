import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as useApp } from "./store-CNkGaKo_.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/connectivity-ClLUgQVv.js
var import_react = /* @__PURE__ */ __toESM(require_react());
/**
* Single source of truth for "are we online?".
* Combines the browser's navigator.onLine signal with the in-app
* "Simulate Offline Mode" toggle for demos.
*/
function useConnectivity() {
	const simulateOffline = useApp((s) => s.simulateOffline);
	const [networkOnline, setNetworkOnline] = (0, import_react.useState)(true);
	const [hydrated, setHydrated] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		setHydrated(true);
		const update = () => setNetworkOnline(navigator.onLine);
		update();
		window.addEventListener("online", update);
		window.addEventListener("offline", update);
		return () => {
			window.removeEventListener("online", update);
			window.removeEventListener("offline", update);
		};
	}, []);
	const online = hydrated ? networkOnline && !simulateOffline : true;
	return {
		online,
		offline: !online,
		simulated: simulateOffline,
		networkOnline,
		hydrated
	};
}
//#endregion
export { useConnectivity as t };
