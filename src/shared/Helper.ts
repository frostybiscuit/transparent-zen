export const isValidColor = (color: string): boolean => {
	const style = new Option().style;
	style.color = color;
	return style.color !== "";
};

export const getValidColorOrFallback = (color: string | undefined, fallback: string): string => {
	if (color && isValidColor(color)) {
		return color;
	}

	return fallback;
};
