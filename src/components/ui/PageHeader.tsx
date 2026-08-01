import React from "react";

export const PageHeader = ({
	title,
	subtitle,
	actions,
}: {
	title: string;
	subtitle?: string;
	actions?: React.ReactNode;
}) => (
	<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
		<div>
			<h2 className="text-lg font-bold text-ink">{title}</h2>
			{subtitle && <p className="text-xs text-ink-faint mt-0.5">{subtitle}</p>}
		</div>
		{actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
	</div>
);
