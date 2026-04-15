'use client';

interface Props {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

const tabs = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'history', label: 'History', icon: '📊' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function BottomNav({ activeTab, onTabChange }: Props) {
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-40 glass-strong pb-safe">
            <div className="max-w-[480px] mx-auto flex items-center justify-around py-2">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`flex flex-col items-center gap-0.5 py-1.5 px-5 rounded-xl transition-all tap-scale ${activeTab === tab.id
                                ? 'text-primary-light'
                                : 'text-text-muted'
                            }`}
                    >
                        <span className={`text-xl transition-transform duration-200 ${activeTab === tab.id ? 'scale-110' : ''
                            }`}>
                            {tab.icon}
                        </span>
                        <span className={`text-[10px] font-medium ${activeTab === tab.id ? 'text-primary-light' : 'text-text-muted'
                            }`}>
                            {tab.label}
                        </span>
                        {activeTab === tab.id && (
                            <div className="w-5 h-0.5 bg-primary rounded-full mt-0.5" />
                        )}
                    </button>
                ))}
            </div>
        </nav>
    );
}
