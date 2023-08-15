export interface Person {
    id: number;
    name: string;
    kg: number;
}

export interface Container {
    title: string;
    capacity: number;
}

export interface Infos {
    id: number;
    created_at: string;
    daily_goal: number;
    person: string;
    drank: number;
    reached_goal: boolean;
}