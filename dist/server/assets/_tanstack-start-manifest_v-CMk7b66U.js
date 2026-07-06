//#region \0tanstack-start-manifest:v
var tsrStartManifest = () => ({ routes: {
	__root__: {
		filePath: "/Users/vasanthi/repo/medsbuddy-ai/src/routes/__root.tsx",
		children: [
			"/",
			"/caregiver",
			"/doctor",
			"/emergency",
			"/memory",
			"/profile",
			"/reminders",
			"/talk",
			"/api/health",
			"/api/qwen-proof",
			"/api/tts"
		],
		preloads: [
			"/assets/index-DR1BENHC.js",
			"/assets/store-CdZbybXg.js",
			"/assets/useStore-07bvxyMd.js",
			"/assets/invariant-DEEwAagU.js",
			"/assets/dist-CKLeEM1A.js"
		],
		scripts: [{ attrs: {
			type: "module",
			async: !0,
			src: "/assets/index-DR1BENHC.js"
		} }]
	},
	"/": {
		filePath: "/Users/vasanthi/repo/medsbuddy-ai/src/routes/index.tsx",
		children: void 0,
		preloads: [
			"/assets/routes-DWfvArQh.js",
			"/assets/app-shell-c_Uo0A2Z.js",
			"/assets/proxy-5FDKyezs.js",
			"/assets/connectivity-Czd_pkhf.js",
			"/assets/activity-Dv9TpTBi.js",
			"/assets/check-f0QNoBEt.js",
			"/assets/chevron-right-DatP7J46.js",
			"/assets/circle-check-BC6zLlxQ.js",
			"/assets/message-circle-BD_QhBng.js",
			"/assets/file-text-BPJs766b.js",
			"/assets/mic-BnkAyhCM.js",
			"/assets/pill-C9Yx4izf.js",
			"/assets/plus-BeHc_cSv.js",
			"/assets/shield-check-CNlrT20F.js",
			"/assets/stethoscope-eiMoZOut.js",
			"/assets/triangle-alert-PsmrT-_u.js",
			"/assets/ai-orb-Dom3tIEx.js"
		]
	},
	"/caregiver": {
		filePath: "/Users/vasanthi/repo/medsbuddy-ai/src/routes/caregiver.tsx",
		children: void 0,
		preloads: [
			"/assets/caregiver-Cabf0EKS.js",
			"/assets/app-shell-c_Uo0A2Z.js",
			"/assets/activity-Dv9TpTBi.js",
			"/assets/circle-alert-IQ6kmmSP.js",
			"/assets/circle-check-BC6zLlxQ.js",
			"/assets/pill-C9Yx4izf.js"
		]
	},
	"/doctor": {
		filePath: "/Users/vasanthi/repo/medsbuddy-ai/src/routes/doctor.tsx",
		children: [
			"/doctor/record",
			"/doctor/visit-mode",
			"/doctor/"
		],
		preloads: ["/assets/doctor-h7LMogw7.js", "/assets/app-shell-c_Uo0A2Z.js"]
	},
	"/emergency": {
		filePath: "/Users/vasanthi/repo/medsbuddy-ai/src/routes/emergency.tsx",
		children: void 0,
		preloads: [
			"/assets/emergency-DhgIqsGV.js",
			"/assets/app-shell-c_Uo0A2Z.js",
			"/assets/AnimatePresence-Uuq0Wjg9.js",
			"/assets/proxy-5FDKyezs.js",
			"/assets/connectivity-Czd_pkhf.js",
			"/assets/chevron-right-DatP7J46.js",
			"/assets/heart-LvmhQwxi.js",
			"/assets/pill-C9Yx4izf.js",
			"/assets/shield-check-CNlrT20F.js",
			"/assets/x-DOK_nrDi.js"
		]
	},
	"/memory": {
		filePath: "/Users/vasanthi/repo/medsbuddy-ai/src/routes/memory.tsx",
		children: void 0,
		preloads: [
			"/assets/memory-iAoGSrGU.js",
			"/assets/app-shell-c_Uo0A2Z.js",
			"/assets/proxy-5FDKyezs.js",
			"/assets/connectivity-Czd_pkhf.js",
			"/assets/activity-Dv9TpTBi.js",
			"/assets/calendar-Dy1ORjU_.js",
			"/assets/check-f0QNoBEt.js",
			"/assets/file-text-BPJs766b.js",
			"/assets/mic-BnkAyhCM.js",
			"/assets/pill-C9Yx4izf.js",
			"/assets/plus-BeHc_cSv.js",
			"/assets/sticky-note-rfabHjCc.js",
			"/assets/trash-2-DDqmyp9Z.js",
			"/assets/x-DOK_nrDi.js"
		]
	},
	"/profile": {
		filePath: "/Users/vasanthi/repo/medsbuddy-ai/src/routes/profile.tsx",
		children: void 0,
		preloads: [
			"/assets/profile-Cu_Hcieh.js",
			"/assets/app-shell-c_Uo0A2Z.js",
			"/assets/message-circle-BD_QhBng.js",
			"/assets/plus-BeHc_cSv.js",
			"/assets/trash-2-DDqmyp9Z.js"
		]
	},
	"/reminders": {
		filePath: "/Users/vasanthi/repo/medsbuddy-ai/src/routes/reminders.tsx",
		children: void 0,
		preloads: [
			"/assets/reminders-zTOLu0AK.js",
			"/assets/app-shell-c_Uo0A2Z.js",
			"/assets/proxy-5FDKyezs.js",
			"/assets/check-f0QNoBEt.js",
			"/assets/pill-C9Yx4izf.js",
			"/assets/plus-BeHc_cSv.js",
			"/assets/trash-2-DDqmyp9Z.js",
			"/assets/x-DOK_nrDi.js"
		]
	},
	"/talk": {
		filePath: "/Users/vasanthi/repo/medsbuddy-ai/src/routes/talk.tsx",
		children: ["/talk/$threadId", "/talk/"],
		preloads: ["/assets/talk-D-Waiup1.js", "/assets/app-shell-c_Uo0A2Z.js"]
	},
	"/doctor/record": {
		filePath: "/Users/vasanthi/repo/medsbuddy-ai/src/routes/doctor.record.tsx",
		children: void 0,
		preloads: [
			"/assets/doctor.record-DAD11xZc.js",
			"/assets/proxy-5FDKyezs.js",
			"/assets/check-f0QNoBEt.js",
			"/assets/shield-alert-uIR_j3Du.js",
			"/assets/mic-off-CfxrXZhu.js",
			"/assets/mic-BnkAyhCM.js",
			"/assets/square-BdKQWqUh.js",
			"/assets/shield-check-CNlrT20F.js",
			"/assets/sticky-note-rfabHjCc.js"
		]
	},
	"/doctor/visit-mode": {
		filePath: "/Users/vasanthi/repo/medsbuddy-ai/src/routes/doctor.visit-mode.tsx",
		children: void 0,
		preloads: [
			"/assets/doctor.visit-mode-D1xJuhsv.js",
			"/assets/ai-chat.functions-QadyZi1L.js",
			"/assets/proxy-5FDKyezs.js",
			"/assets/connectivity-Czd_pkhf.js",
			"/assets/check-f0QNoBEt.js",
			"/assets/shield-alert-uIR_j3Du.js",
			"/assets/circle-alert-IQ6kmmSP.js",
			"/assets/list-checks-CdyyTkwZ.js",
			"/assets/loader-circle-CTORRTa5.js",
			"/assets/mic-off-CfxrXZhu.js",
			"/assets/mic-BnkAyhCM.js",
			"/assets/square-BdKQWqUh.js",
			"/assets/shield-check-CNlrT20F.js",
			"/assets/stethoscope-eiMoZOut.js"
		]
	},
	"/talk/$threadId": {
		filePath: "/Users/vasanthi/repo/medsbuddy-ai/src/routes/talk.$threadId.tsx",
		children: void 0,
		preloads: [
			"/assets/talk._threadId-BHlRk-Mx.js",
			"/assets/ai-chat.functions-QadyZi1L.js",
			"/assets/AnimatePresence-Uuq0Wjg9.js",
			"/assets/proxy-5FDKyezs.js",
			"/assets/connectivity-Czd_pkhf.js",
			"/assets/message-circle-BD_QhBng.js",
			"/assets/send-DsNje6Nh.js",
			"/assets/loader-circle-CTORRTa5.js",
			"/assets/mic-off-CfxrXZhu.js",
			"/assets/mic-BnkAyhCM.js",
			"/assets/plus-BeHc_cSv.js",
			"/assets/trash-2-DDqmyp9Z.js",
			"/assets/x-DOK_nrDi.js",
			"/assets/ai-orb-Dom3tIEx.js"
		]
	},
	"/doctor/": {
		filePath: "/Users/vasanthi/repo/medsbuddy-ai/src/routes/doctor.index.tsx",
		children: void 0,
		preloads: [
			"/assets/doctor.index-BqP3z0od.js",
			"/assets/ai-chat.functions-QadyZi1L.js",
			"/assets/proxy-5FDKyezs.js",
			"/assets/connectivity-Czd_pkhf.js",
			"/assets/activity-Dv9TpTBi.js",
			"/assets/calendar-Dy1ORjU_.js",
			"/assets/check-f0QNoBEt.js",
			"/assets/chevron-right-DatP7J46.js",
			"/assets/circle-alert-IQ6kmmSP.js",
			"/assets/file-text-BPJs766b.js",
			"/assets/heart-LvmhQwxi.js",
			"/assets/send-DsNje6Nh.js",
			"/assets/list-checks-CdyyTkwZ.js",
			"/assets/mic-BnkAyhCM.js",
			"/assets/square-BdKQWqUh.js",
			"/assets/pill-C9Yx4izf.js",
			"/assets/plus-BeHc_cSv.js",
			"/assets/shield-check-CNlrT20F.js",
			"/assets/stethoscope-eiMoZOut.js",
			"/assets/sticky-note-rfabHjCc.js",
			"/assets/trash-2-DDqmyp9Z.js",
			"/assets/triangle-alert-PsmrT-_u.js",
			"/assets/x-DOK_nrDi.js"
		]
	},
	"/talk/": {
		filePath: "/Users/vasanthi/repo/medsbuddy-ai/src/routes/talk.index.tsx",
		children: void 0,
		preloads: ["/assets/talk.index-CQLQGhXv.js"]
	}
} });
//#endregion
export { tsrStartManifest };
