// src/components/ModuleListSkeleton.tsx
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

const ModuleListSkeleton: React.FC = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            {Array.from({ length: 2 }).map((_, i) => (
                <div
                    key={i}
                    className="bg-card rounded-md p-4 shadow flex flex-col md:flex-row justify-between items-stretch gap-4 min-h-[140px] border"
                    style={{ borderColor: "hsl(var(--border) / 0.35)" }}
                >
                    <div className="flex-1 min-w-0 space-y-2">
                        <Skeleton className={`h-5 ${i % 2 === 0 ? "w-56" : "w-64"}`} />
                        <Skeleton className="h-4 w-24" />
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="w-32 flex-shrink-0 flex justify-center">
                            <Skeleton className="h-[88px] w-[88px] rounded-full" />
                        </div>

                        <div className="flex flex-col items-end gap-2">
                            <Skeleton className="h-7 w-16" />
                            <Skeleton className="h-9 w-9 rounded" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ModuleListSkeleton;