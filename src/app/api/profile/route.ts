import { NextRequest, NextResponse } from 'next/server';
import { countStoredLogs, getTodayLogForUser, saveUserProfile } from '@/lib/database';
import { getRequestSession, readDateString } from '@/lib/request';
import { UserProfile } from '@/lib/types';

export const runtime = 'nodejs';

function isValidProfile(profile: Partial<UserProfile>): profile is UserProfile {
    return (
        typeof profile.name === 'string' &&
        profile.name.trim().length > 0 &&
        Number.isFinite(profile.weight) &&
        Number(profile.weight) > 0 &&
        Number.isFinite(profile.height) &&
        Number(profile.height) > 0 &&
        Number.isFinite(profile.age) &&
        Number(profile.age) > 0 &&
        (profile.gender === 'male' || profile.gender === 'female') &&
        (profile.goal === 'muscle_building' || profile.goal === 'weight_loss' || profile.goal === 'maintain') &&
        (
            profile.activityLevel === 'sedentary' ||
            profile.activityLevel === 'light' ||
            profile.activityLevel === 'moderate' ||
            profile.activityLevel === 'active' ||
            profile.activityLevel === 'very_active'
        ) &&
        typeof profile.createdAt === 'string'
    );
}

export async function PUT(request: NextRequest) {
    try {
        const session = await getRequestSession(request);
        if (!session.user) {
            return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
        }

        const body = await request.json();
        const profile = body.profile as Partial<UserProfile>;
        const date = readDateString(body.date);

        if (!date) {
            return NextResponse.json({ error: 'A local date is required.' }, { status: 400 });
        }

        if (!isValidProfile(profile)) {
            return NextResponse.json({ error: 'Profile details are incomplete.' }, { status: 400 });
        }

        const savedProfile = await saveUserProfile(session.user.id, profile);
        const [todayLog, totalDays] = await Promise.all([
            getTodayLogForUser(session.user.id, date),
            countStoredLogs(session.user.id),
        ]);

        return NextResponse.json({
            profile: savedProfile,
            todayLog,
            totalDays,
        });
    } catch (error) {
        console.error('Save profile error:', error);
        return NextResponse.json({ error: 'Unable to save your profile right now.' }, { status: 500 });
    }
}
