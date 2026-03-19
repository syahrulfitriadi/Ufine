import React from 'react';

// Base skeleton block with shimmer
const SkeletonBlock = ({ className = '' }) => (
    <div className={`bg-slate-200/60 rounded-xl animate-pulse ${className}`} />
);

// Dashboard skeleton
export const DashboardSkeleton = () => (
    <div className="space-y-4">
        {/* Greeting */}
        <div className="flex items-center gap-3 mb-2">
            <SkeletonBlock className="w-12 h-12 rounded-full" />
            <div className="space-y-2">
                <SkeletonBlock className="h-4 w-24" />
                <SkeletonBlock className="h-3 w-36" />
            </div>
        </div>

        {/* Summary cards */}
        <div className="glass-card p-4 space-y-4">
            <div className="grid grid-cols-3 gap-3">
                <SkeletonBlock className="h-20 rounded-2xl" />
                <SkeletonBlock className="h-20 rounded-2xl" />
                <SkeletonBlock className="h-20 rounded-2xl" />
            </div>

            {/* Chart area */}
            <SkeletonBlock className="h-8 w-40 mx-auto" />
            <SkeletonBlock className="h-48 rounded-2xl" />
        </div>

        {/* Recent transactions */}
        <SkeletonBlock className="h-5 w-32" />
        <div className="space-y-3">
            {[1, 2, 3].map(i => (
                <div key={i} className="glass-card p-4 flex items-center gap-3">
                    <SkeletonBlock className="w-10 h-10 rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                        <SkeletonBlock className="h-4 w-24" />
                        <SkeletonBlock className="h-3 w-16" />
                    </div>
                    <SkeletonBlock className="h-4 w-20" />
                </div>
            ))}
        </div>
    </div>
);

// History page skeleton
export const HistorySkeleton = () => (
    <div className="space-y-4">
        <SkeletonBlock className="h-6 w-40" />
        <div className="glass-card p-4 space-y-4">
            {/* Filters */}
            <div className="flex gap-2">
                <SkeletonBlock className="h-10 flex-1 rounded-xl" />
                <SkeletonBlock className="h-10 w-28 rounded-xl" />
            </div>

            {/* Month card */}
            <div className="flex gap-3">
                <SkeletonBlock className="w-24 h-24 rounded-2xl" />
                <div className="flex-1 space-y-2">
                    <SkeletonBlock className="h-4 w-20" />
                    <SkeletonBlock className="h-4 w-28" />
                    <SkeletonBlock className="h-4 w-24" />
                </div>
            </div>

            {/* Table rows */}
            <div className="space-y-2">
                <SkeletonBlock className="h-8 w-full rounded-lg" />
                {[1, 2, 3, 4, 5].map(i => (
                    <SkeletonBlock key={i} className="h-10 w-full rounded-lg" />
                ))}
            </div>
        </div>
    </div>
);

// Report page skeleton
export const ReportSkeleton = () => (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <SkeletonBlock className="h-6 w-32" />
            <div className="flex gap-2">
                <SkeletonBlock className="h-9 w-9 rounded-lg" />
                <SkeletonBlock className="h-9 w-9 rounded-lg" />
            </div>
        </div>

        <div className="glass-card p-4 space-y-4">
            {/* Filters */}
            <div className="flex gap-2">
                <SkeletonBlock className="h-10 flex-1 rounded-xl" />
                <SkeletonBlock className="h-10 w-28 rounded-xl" />
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3">
                <SkeletonBlock className="h-24 rounded-2xl" />
                <SkeletonBlock className="h-24 rounded-2xl" />
            </div>

            {/* Balance bar */}
            <SkeletonBlock className="h-20 rounded-2xl" />

            {/* Table */}
            <SkeletonBlock className="h-5 w-28" />
            <div className="space-y-2">
                <SkeletonBlock className="h-8 w-full rounded-lg" />
                {[1, 2, 3, 4, 5].map(i => (
                    <SkeletonBlock key={i} className="h-10 w-full rounded-lg" />
                ))}
            </div>
        </div>
    </div>
);

export default SkeletonBlock;
