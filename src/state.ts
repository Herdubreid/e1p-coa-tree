// App State

export interface IState {
    timeStamp: number;
    rows: any[];
}

// State Params
export interface IStateParams {
    state: IState;
}

export const initState: IState = {
    timeStamp: 8,
    rows: [],
};
