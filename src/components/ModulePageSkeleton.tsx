// src/components/ModulePageSkeleton.tsx
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

const ModulePageSkeleton: React.FC = () => {
    return (
        <div className="max-w-[1700px] mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <Skeleton className="h-10 w-10" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-7 w-64" />
                    <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-10 w-36" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <section className="bg-card p-4 rounded shadow">
                        <Skeleton className="h-5 w-20 mb-4" />
                        <Skeleton className="h-9 w-40 mb-4" />

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end mb-4">
                            <div className="md:col-span-2 space-y-2">
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-9 w-full" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-9 w-full" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-9 w-full" />
                            </div>
                            <div className="md:col-span-4">
                                <Skeleton className="h-10 w-28" />
                            </div>
                        </div>

                        <div className="space-y-3">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="py-2 flex flex-wrap items-start gap-3 md:flex-nowrap">
                                    <div className="flex-1 min-w-0 space-y-2">
                                        <Skeleton className={`h-4 ${i % 2 === 0 ? "w-40" : "w-56"}`} />
                                        <Skeleton className="h-4 w-48" />
                                    </div>
                                    <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:flex-nowrap md:justify-end">
                                        <Skeleton className="h-9 w-20" />
                                        <Skeleton className="h-9 w-20" />
                                        <Skeleton className="h-9 w-20" />
                                        <Skeleton className="h-9 w-10" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="bg-card p-4 rounded shadow">
                        <Skeleton className="h-5 w-44 mb-4" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-3 flex items-center gap-3 bg-sidebar-accent rounded">
                                <Skeleton className="h-16 w-16 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-44" />
                                    <Skeleton className="h-6 w-20" />
                                </div>
                            </div>
                            <div className="p-3 bg-sidebar-accent rounded space-y-3">
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-40 w-full" />
                            </div>
                        </div>
                    </section>
                </div>

                <aside className="space-y-4">
                    <section className="bg-card p-4 rounded shadow">
                        <Skeleton className="h-5 w-52 mb-4" />
                        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                            <div className="w-full sm:flex-shrink-0 sm:w-1/2 flex justify-center" style={{ maxWidth: 300 }}>
                                <Skeleton className="h-56 w-56 rounded-full" />
                            </div>
                            <div className="flex-1 min-w-0 space-y-3">
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-7 w-24" />
                                <Skeleton className="h-4 w-56" />
                                <Skeleton className="h-4 w-32" />
                                <div className="space-y-2 pt-2">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <Skeleton className="w-3 h-3 rounded-full" />
                                            <Skeleton className={`h-4 ${i % 2 ? "w-48" : "w-56"}`} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="bg-card p-4 rounded shadow space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-11/12" />
                        <Skeleton className="h-4 w-3/4" />
                    </section>
                </aside>
            </div>
        </div>
    );
};

export default ModulePageSkeleton;