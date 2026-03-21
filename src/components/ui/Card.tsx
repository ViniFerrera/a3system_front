import React from 'react';

export const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
	<div className={`bg-white border border-slate-200/60 rounded-2xl shadow-card hover:shadow-card-hover transition-shadow duration-200 ${className}`}>
		{children}
	</div>
);
