import React from "react";

export const EmptyState = ({
	icon,
	title,
	description,
	action,
}: {
	icon?: React.ReactNode;
	title: string;
	description?: string;
	action?: React.ReactNode;
}) => (
	<div className="flex flex-col items-center justify-center text-center py-12 px-6">
		{icon && <div className="text-ink-faint/60 mb-3">{icon}</div>}
		<p className="text-sm font-semibold text-ink-muted">{title}</p>
		{description && <p className="text-xs text-ink-faint mt-1 max-w-sm">{description}</p>}
		{action && <div className="mt-4">{action}</div>}
	</div>
);
