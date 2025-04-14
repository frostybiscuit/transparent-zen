export type Manifest = {
	manifest_version: number;
	name: string;
	version: string;
	description?: string;
	icons?: {
		[size: string]: string;
	};
	action?: {
		default_popup?: string;
		default_icon?: {
			[size: string]: string;
		};
		default_title?: string;
	};
	background?: {
		service_worker: string;
		type?: "module";
	};
	permissions?: Array<string>;
	host_permissions?: Array<string>;
	content_scripts?: Array<{
		matches: Array<string>;
		js?: Array<string>;
		css?: Array<string>;
		run_at?: "document_start" | "document_end" | "document_idle";
		all_frames?: boolean;
		match_about_blank?: boolean;
	}>;
	web_accessible_resources?: Array<{
		resources: Array<string>;
		matches: Array<string>;
		use_dynamic_url?: boolean;
	}>;
	options_ui?: {
		page: string;
		open_in_tab?: boolean;
	};
	content_security_policy?: {
		extension_pages: string;
	};
	browser_specific_settings?: {
		gecko?: {
			id?: string;
			strict_min_version?: string;
		};
	};
	default_locale?: string;
};
