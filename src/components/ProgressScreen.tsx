'use client';

import { useState } from 'react';
import { WorkoutEntry, WeightEntry } from '@/lib/types';
import WorkoutLog from '@/components/WorkoutLog';
import ProgressTracker from '@/components/ProgressTracker';

interface Props {
    workouts: WorkoutEntry[];
    weightEntries: WeightEntry[];
    startWeight?: number;
    onAddWorkout: (workout: Omit<WorkoutEntry, 'id'>) => Promise<void>;
    onDeleteWorkout: (id: string) => Promise<void>;
    onAddWeight: (entry: Omit<WeightEntry, 'id'>) => Promise<void>;
    onDeleteWeight: (id: string) => Promise<void>;
}

export default function ProgressScreen({
    workouts,
    weightEntries,
    startWeight,
    onAddWorkout,
    onDeleteWorkout,
    onAddWeight,
    onDeleteWeight,
}: Props) {
    const [subTab, setSubTab] = useState<'weight' | 'workouts'>('weight');

    return (
        <div className="relative min-h-dvh">
            <div className="sticky top-0 z-10 bg-page/95 px-4 pt-4 pb-2 backdrop-blur">
                <div className="mx-auto flex max-w-[680px] rounded-lg border border-line bg-white p-1">
                    <SubTabButton active={subTab === 'weight'} onClick={() => setSubTab('weight')}>
                        Weight
                    </SubTabButton>
                    <SubTabButton active={subTab === 'workouts'} onClick={() => setSubTab('workouts')}>
                        Workouts
                    </SubTabButton>
                </div>
            </div>

            {subTab === 'weight' ? (
                <ProgressTracker
                    entries={weightEntries}
                    startWeight={startWeight}
                    onAdd={onAddWeight}
                    onDelete={onDeleteWeight}
                />
            ) : (
                <WorkoutLog
                    logs={workouts}
                    onAdd={onAddWorkout}
                    onDelete={onDeleteWorkout}
                />
            )}
        </div>
    );
}

function SubTabButton({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`tap-scale min-h-11 flex-1 rounded-md text-sm font-black ${active
                ? 'bg-brand text-white shadow-[0_10px_22px_rgba(11,107,88,0.18)]'
                : 'text-muted'
                }`}
        >
            {children}
        </button>
    );
}
