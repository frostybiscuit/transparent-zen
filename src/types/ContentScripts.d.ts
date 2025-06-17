export type ContentScripts = {
	supportedWebsites: Array<SupportedWebsite>;
};

export type SupportedWebsite = {
	name: string;
	matches: Array<string>;
	js?: Array<string>;
	css?: Array<string>;
	run_at?: "document_start" | "document_end" | "document_idle";
	favicon?: string;
};
