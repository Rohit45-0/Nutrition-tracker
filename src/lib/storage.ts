import { AppBootstrap, DayLog, MealEntry, UserProfile, AuthUser } from './types';

export class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

async function readJson<T>(response: Response) {
    const text = await response.text();
    if (!text) {
        return null as T;
    }

    return JSON.parse(text) as T;
}

async function request<T>(input: RequestInfo | URL, init?: RequestInit) {
    const response = await fetch(input, {
        credentials: 'same-origin',
        ...init,
        headers: {
            ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
            ...(init?.headers ?? {}),
        },
    });

    const payload = await readJson<{ error?: string } & T>(response);

    if (!response.ok) {
        throw new ApiError(payload?.error || 'Request failed.', response.status);
    }

    return payload as T;
}

export interface CredentialsInput {
    email: string;
    password: string;
    rememberMe: boolean;
}

export interface SignUpInput extends CredentialsInput {
    name: string;
}

interface AuthResponse {
    user: AuthUser;
}

interface ProfileResponse {
    profile: UserProfile | null;
    todayLog: DayLog;
    totalDays: number;
}

interface DayLogMutationResponse {
    todayLog: DayLog;
    totalDays: number;
}

export async function getBootstrapData(date: string, days = 30) {
    return request<AppBootstrap>(`/api/app/bootstrap?date=${date}&days=${days}`);
}

export async function signUp(input: SignUpInput) {
    return request<AuthResponse>('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(input),
    });
}

export async function signIn(input: CredentialsInput) {
    return request<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(input),
    });
}

export async function signOut() {
    return request<{ success: boolean }>('/api/auth/logout', {
        method: 'POST',
        body: JSON.stringify({}),
    });
}

export async function saveProfile(profile: UserProfile, date: string) {
    return request<ProfileResponse>('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({ profile, date }),
    });
}

export async function addMealToLog(meal: MealEntry, date: string) {
    return request<DayLogMutationResponse>('/api/meals', {
        method: 'POST',
        body: JSON.stringify({ meal, date }),
    });
}

export async function deleteMealFromLog(mealId: string, date: string) {
    return request<DayLogMutationResponse>(`/api/meals/${mealId}?date=${date}`, {
        method: 'DELETE',
    });
}

export async function updateMealInLog(mealId: string, meal: MealEntry, date: string) {
    return request<DayLogMutationResponse>(`/api/meals/${encodeURIComponent(mealId)}`, {
        method: 'PUT',
        body: JSON.stringify({ meal, date }),
    });
}

export async function updateWater(waterGlasses: number, date: string) {
    return request<DayLogMutationResponse>('/api/water', {
        method: 'PUT',
        body: JSON.stringify({ waterGlasses, date }),
    });
}
