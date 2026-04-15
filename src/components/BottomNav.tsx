'use client';

interface Props {
    activeTab: string;
    onTabChange: (tab: string) => void;
    onAddMeal: () => void;
}

const tabs = [
    {
        id: 'home',
        label: 'Today',
        icon: (
            <path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1v-8.5Z" />
        ),
    },
    {
        id: 'history',
        label: 'History',
        icon: (
            <>
                <path d="M5 19V9" />
                <path d="M12 19V5" />
                <path d="M19 19v-7" />
            </>
        ),
    },
    {
        id: 'settings',
        label: 'Me',
        icon: (
            <>
                <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
            </>
        ),
    },
];

export default function BottomNav({ activeTab, onTabChange, onAddMeal }: Props) {
    return (
        <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-safe">
            <div className="mx-auto grid max-w-[680px] grid-cols-[1fr_1fr_74px_1fr] items-end gap-2 rounded-lg border border-line-strong/70 bg-surface/95 p-2 shadow-[0_-16px_42px_rgba(36,76,57,0.16)] backdrop-blur">
                {tabs.slice(0, 2).map((tab) => (
                    <NavButton
                        key={tab.id}
                        active={activeTab === tab.id}
                        label={tab.label}
                        onClick={() => onTabChange(tab.id)}
                    >
                        {tab.icon}
                    </NavButton>
                ))}

                <button
                    type="button"
                    onClick={onAddMeal}
                    className="tap-scale flex h-16 flex-col items-center justify-center rounded-lg bg-brand text-white shadow-[0_14px_28px_rgba(11,107,88,0.28)]"
                    aria-label="Log a meal"
                >
                    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                        <path d="M12 5v14" />
                        <path d="M5 12h14" />
                    </svg>
                    <span className="mt-0.5 text-[11px] font-black">Log</span>
                </button>

                <NavButton
                    active={activeTab === tabs[2].id}
                    label={tabs[2].label}
                    onClick={() => onTabChange(tabs[2].id)}
                >
                    {tabs[2].icon}
                </NavButton>
            </div>
        </nav>
    );
}

function NavButton({
    active,
    label,
    onClick,
    children,
}: {
    active: boolean;
    label: string;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`tap-scale flex h-14 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-black ${active
                ? 'bg-brand-soft text-brand-strong'
                : 'text-muted'
                }`}
            aria-current={active ? 'page' : undefined}
        >
            <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                {children}
            </svg>
            <span>{label}</span>
        </button>
    );
}
